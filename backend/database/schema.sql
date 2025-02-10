DROP TABLE IF EXISTS user_auth;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    email VARCHAR(100) PRIMARY KEY,  -- Email is now the unique identifier
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_auth (
    email VARCHAR(100) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    password TEXT NOT NULL
);