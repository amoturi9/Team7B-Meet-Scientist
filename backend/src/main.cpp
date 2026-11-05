#include "httplib.h"
#include <sodium.h>
#include <sqlite3.h>
#include <filesystem>
#include <iostream>
#include <mutex>
#include <ctime>
#include <regex>
#include <stdexcept>
#include <sys/stat.h>

// SQLite keeps accounts on disk. Only the server can access this file.
struct Query {
    sqlite3_stmt* p = nullptr;
    Query(sqlite3* db, const char* sql) {
        if (sqlite3_prepare_v2(db, sql, -1, &p, nullptr) != SQLITE_OK) throw std::runtime_error("Database query failed");
    }
    ~Query() { sqlite3_finalize(p); }
    void bind(int n, const std::string& s) { sqlite3_bind_text(p, n, s.c_str(), -1, SQLITE_TRANSIENT); }
    int step() { return sqlite3_step(p); }
    std::string text(int n) { const auto* s=sqlite3_column_text(p,n); return s ? reinterpret_cast<const char*>(s) : ""; }
};
std::string trim(std::string s) {
    auto a=s.find_first_not_of(" \t\r\n");
    return a==std::string::npos ? "" : s.substr(a,s.find_last_not_of(" \t\r\n")-a+1);
}
std::string json(const std::string& s) {
    std::string out="\"";
    for (unsigned char c:s) {
        if(c=='"' || c=='\\') {out+='\\'; out+=c;}
        else if(c<32) { char b[7]; snprintf(b,sizeof(b),"\\u%04x",c); out+=b; }
        else out+=c;
    }
    return out+'"';
}
std::string digest(const std::string& s) {
    unsigned char hash[32]; char hex[65];
    crypto_generichash(hash,sizeof(hash),reinterpret_cast<const unsigned char*>(s.data()),s.size(),nullptr,0);
    sodium_bin2hex(hex,sizeof(hex),hash,sizeof(hash)); return hex;
}
std::string token(const httplib::Request& r) {
    std::string cookies=r.get_header_value("Cookie");
    std::istringstream stream(cookies); std::string part;
    while(std::getline(stream,part,';')) {
        part=trim(part);
        if(part.rfind("session=",0)==0) return part.substr(8);
    }
    return "";
}
int main() {
    umask(0077);
    if(sodium_init()<0) return 1;
    std::filesystem::create_directories("data");
    sqlite3* db=nullptr;
    if(sqlite3_open("data/accounts.db",&db)!=SQLITE_OK) {std::cerr<<"Cannot open database\n"; return 1;}
    sqlite3_busy_timeout(db,5000);
    const char* schema="PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;"
        "CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('teacher','scientist')));"
        "CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);";
    if(sqlite3_exec(db,schema,nullptr,nullptr,nullptr)!=SQLITE_OK) {std::cerr<<"Cannot initialize database\n"; return 1;}
    std::mutex mutex;
    httplib::Server server;
    server.set_payload_max_length(8192);
    server.set_exception_handler([](const auto&,auto& res,std::exception_ptr){res.status=500;res.set_content("Something went wrong. Please try again.","text/plain");});
    server.set_pre_routing_handler([](const auto& req,auto& res){
        res.set_header("X-Content-Type-Options","nosniff");
        res.set_header("Referrer-Policy","same-origin");
        res.set_header("Cache-Control","no-store");
        // Custom header cannot be sent by an unrelated website without CORS permission.
        const auto host=req.get_header_value("Host");
        if(host!="localhost:8080" && host!="127.0.0.1:8080") {res.status=403;return httplib::Server::HandlerResponse::Handled;}
        if(req.method=="POST" && req.get_header_value("X-Requested-With")!="MeetScientist") {
            res.status=403;res.set_content("Please use the website form.","text/plain"); return httplib::Server::HandlerResponse::Handled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });
    auto reply=[](auto& res,int status,const std::string& msg){res.status=status;res.set_content(msg,"text/plain; charset=utf-8");};
    // A small local-demo rate limit also bounds expensive password hashing work.
    time_t window=0; int attempts=0;
    auto limited=[&](auto& res){auto now=time(nullptr);if(now-window>=60){window=now;attempts=0;}if(++attempts>30){res.set_header("Retry-After","60");reply(res,429,"Too many attempts. Wait one minute and try again.");return true;}return false;};
    char dummy[crypto_pwhash_STRBYTES];
    if(crypto_pwhash_str(dummy,"unused-password",15,crypto_pwhash_OPSLIMIT_INTERACTIVE,crypto_pwhash_MEMLIMIT_INTERACTIVE)!=0) return 1;
    server.Post("/api/signup",[&](const auto& req,auto& res){
        std::lock_guard<std::mutex> lock(mutex); if(limited(res)) return;
        auto name=trim(req.get_param_value("name")),email=trim(req.get_param_value("email")),password=req.get_param_value("password"),role=req.get_param_value("role");
        for(char& c:email) c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
        if(name.empty() || name.size()>80 || email.size()>254 || !std::regex_match(email,std::regex(R"([^\s@]+@[^\s@]+\.[^\s@]+)")) || password.size()<15 || password.size()>128 || password.find('\0')!=std::string::npos || (role!="teacher" && role!="scientist")) {
            reply(res,400,"Enter a name, valid email, account type, and a password of 15–128 bytes.");return;
        }
        char hash[crypto_pwhash_STRBYTES];
        if(crypto_pwhash_str(hash,password.data(),password.size(),crypto_pwhash_OPSLIMIT_INTERACTIVE,crypto_pwhash_MEMLIMIT_INTERACTIVE)!=0) {reply(res,503,"Please try again later.");return;}
        Query q(db,"INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)");
        q.bind(1,name);q.bind(2,email);q.bind(3,hash);q.bind(4,role);
        int result=q.step();
        if(result==SQLITE_CONSTRAINT){reply(res,409,"An account with that email already exists. Please log in.");return;}
        if(result!=SQLITE_DONE) throw std::runtime_error("Save failed");
        reply(res,201,"Account created. You can now log in.");
    });
    server.Post("/api/login",[&](const auto& req,auto& res){
        std::lock_guard<std::mutex> lock(mutex);if(limited(res)) return;
        auto email=trim(req.get_param_value("email")),password=req.get_param_value("password");
        for(char& c:email)c=static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
        if(password.size()>128 || email.size()>254){reply(res,401,"Email or password is incorrect.");return;}
        Query q(db,"SELECT id,password_hash FROM users WHERE email=?");q.bind(1,email);
        bool found=q.step()==SQLITE_ROW; auto hash=found?q.text(1):std::string(dummy);
        bool valid=crypto_pwhash_str_verify(hash.c_str(),password.data(),password.size())==0;
        if(!found || !valid){reply(res,401,"Email or password is incorrect.");return;}
        auto id=sqlite3_column_int64(q.p,0);
        Query cleanup(db,"DELETE FROM sessions WHERE expires<=? OR token_hash=?");
        sqlite3_bind_int64(cleanup.p,1,time(nullptr));cleanup.bind(2,digest(token(req)));cleanup.step();
        unsigned char bytes[32];char hex[65];randombytes_buf(bytes,sizeof(bytes));sodium_bin2hex(hex,sizeof(hex),bytes,sizeof(bytes));
        Query insert(db,"INSERT INTO sessions VALUES(?,?,?)");insert.bind(1,digest(hex));sqlite3_bind_int64(insert.p,2,id);sqlite3_bind_int64(insert.p,3,time(nullptr)+86400);
        if(insert.step()!=SQLITE_DONE) throw std::runtime_error("Session failed");
        // HTTP is local only. Public deployment requires HTTPS and Secure cookies.
        res.set_header("Set-Cookie",std::string("session=")+hex+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400");
        reply(res,200,"Logged in.");
    });
    server.Get("/api/me",[&](const auto& req,auto& res){
        std::lock_guard<std::mutex> lock(mutex);
        Query q(db,"SELECT u.name,u.email,u.role FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?");
        q.bind(1,digest(token(req)));sqlite3_bind_int64(q.p,2,time(nullptr));
        if(q.step()!=SQLITE_ROW){reply(res,401,"Please log in.");return;}
        res.set_content("{\"name\":"+json(q.text(0))+",\"email\":"+json(q.text(1))+",\"role\":"+json(q.text(2))+"}","application/json");
    });
    server.Post("/api/logout",[&](const auto& req,auto& res){
        std::lock_guard<std::mutex> lock(mutex);Query q(db,"DELETE FROM sessions WHERE token_hash=?");q.bind(1,digest(token(req)));if(q.step()!=SQLITE_DONE)throw std::runtime_error("Logout failed");
        res.set_header("Set-Cookie","session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");reply(res,200,"Logged out.");
    });
    server.Get("/api/health",[](const auto&,auto& res){res.set_content(R"({"status":"ok","message":"C++ backend is running!"})","application/json");});
    if(!server.set_mount_point("/","./frontend")){std::cerr<<"Run from the project folder.\n";return 1;}
    std::cout<<"Meet a Scientist: http://localhost:8080\n"<<std::flush;
    bool ok=server.listen("127.0.0.1",8080);sqlite3_close(db);
    if(!ok)std::cerr<<"Port 8080 is busy. Stop the other server first.\n";
    return ok?0:1;
}
