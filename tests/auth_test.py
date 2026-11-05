"""Integration tests use a temporary database, never your real accounts."""
import http.cookiejar, json, pathlib, sqlite3, subprocess, tempfile, time, urllib.request, urllib.parse, urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[1]
jar=http.cookiejar.CookieJar()
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path, data=None, status=200, custom=True, browser=client):
    headers={'X-Requested-With':'MeetScientist'} if custom else {}
    req=urllib.request.Request('http://localhost:8080'+path,data=urllib.parse.urlencode(data).encode() if data is not None else None,headers=headers)
    try: r=browser.open(req)
    except urllib.error.HTTPError as e: r=e
    body=r.read().decode(); assert r.status==status,(path,r.status,body)
    return body,r.headers
with tempfile.TemporaryDirectory() as tmp:
    pathlib.Path(tmp,'frontend').symlink_to(ROOT/'frontend',target_is_directory=True)
    def start():
        p=subprocess.Popen([str(ROOT/'build/server')],cwd=tmp,stdout=subprocess.DEVNULL)
        for _ in range(100):
            if p.poll() is not None: raise RuntimeError('Test server could not start; stop other servers on port 8080 first')
            try: request('/api/health'); return p
            except OSError: time.sleep(.05)
        raise RuntimeError('Server did not start')
    p=start()
    try:
        for path in ['/','/signup.html','/login.html','/account.html','/auth.js','/auth.css']: request(path)
        request('/api/me',status=401)
        account={'name':'Test Teacher','email':'Teacher@Example.com','password':'my test passphrase 123','role':'teacher'}
        request('/api/signup',dict(account,password='short'),400)
        request('/api/signup',dict(account,role='admin'),400)
        request('/api/signup',account,403,custom=False)
        request('/api/signup',account,201)
        request('/api/signup',dict(account,email='teacher@example.com'),409)
        request('/api/login',dict(email=account['email'],password='wrong'),401)
        _,headers=request('/api/login',account)
        assert 'HttpOnly' in headers['Set-Cookie'] and 'SameSite=Strict' in headers['Set-Cookie']
        user=json.loads(request('/api/me')[0]); assert user['name']=='Test Teacher' and user['role']=='teacher'
        request('/api/me',status=401,browser=urllib.request.build_opener())
        old_cookie=next(iter(jar)).value
        db=sqlite3.connect(pathlib.Path(tmp,'data/accounts.db'))
        stored=db.execute('SELECT password_hash FROM users').fetchone()[0]
        assert stored.startswith('$argon2id$') and stored!=account['password']
        assert db.execute('SELECT token_hash FROM sessions').fetchone()[0]!=old_cookie
        p.terminate();p.wait();p=start()
        assert json.loads(request('/api/me')[0])['email']=='teacher@example.com'
        request('/api/logout',{})
        request('/api/me',status=401)
        req=urllib.request.Request('http://localhost:8080/api/me',headers={'Cookie':'session='+old_cookie})
        try: urllib.request.urlopen(req); raise AssertionError('Logged out session remained valid')
        except urllib.error.HTTPError as e: assert e.code==401
        request('/api/login',account)
        db.execute('UPDATE sessions SET expires=0');db.commit()
        request('/api/me',status=401)
        request('/data/accounts.db',status=404)
        request('/api/login',{'email':"' OR 1=1 --",'password':'wrong'},401)
        for _ in range(30):
            try:
                request('/api/login',{'email':'none@example.com','password':'wrong'},401)
            except AssertionError as e:
                assert '429' in str(e);break
        else: raise AssertionError('Rate limit not enforced')
        db.close()
        print('PASS: signup, validation, duplicate email, password verification, private sessions, restart persistence, logout invalidation, expiry, database privacy, injection rejection, rate limiting, and page delivery')
    finally:
        p.terminate();p.wait()
