BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 7b5e15d74e3f

CREATE TABLE categories (
    id UUID NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    slug VARCHAR(100) NOT NULL, 
    language VARCHAR(10) NOT NULL, 
    display_order INTEGER NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (slug)
);

CREATE TABLE sources (
    id UUID NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    rss_url TEXT NOT NULL, 
    base_url TEXT NOT NULL, 
    language VARCHAR(10) NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (name)
);

CREATE TABLE users (
    id UUID NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    display_name VARCHAR(100) NOT NULL, 
    preferred_lang VARCHAR(10) NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE articles (
    id UUID NOT NULL, 
    source_id UUID NOT NULL, 
    title TEXT NOT NULL, 
    url TEXT NOT NULL, 
    content_snippet TEXT, 
    published_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    language VARCHAR(10) NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    ai_summary TEXT, 
    ai_tags JSONB, 
    ai_score FLOAT, 
    ai_processed_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(source_id) REFERENCES sources (id), 
    UNIQUE (url)
);

CREATE INDEX ix_articles_published_at ON articles (published_at);

CREATE UNIQUE INDEX ix_articles_url ON articles (url);

CREATE TABLE fetch_logs (
    id UUID NOT NULL, 
    source_id UUID NOT NULL, 
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    finished_at TIMESTAMP WITH TIME ZONE, 
    articles_found INTEGER, 
    articles_new INTEGER, 
    status VARCHAR(20) NOT NULL, 
    error_message TEXT, 
    PRIMARY KEY (id), 
    FOREIGN KEY(source_id) REFERENCES sources (id)
);

CREATE TABLE article_categories (
    article_id UUID NOT NULL, 
    category_id UUID NOT NULL, 
    assigned_by VARCHAR(20) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (article_id, category_id), 
    FOREIGN KEY(article_id) REFERENCES articles (id), 
    FOREIGN KEY(category_id) REFERENCES categories (id)
);

CREATE TABLE user_saved_articles (
    user_id UUID NOT NULL, 
    article_id UUID NOT NULL, 
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (user_id, article_id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    FOREIGN KEY(article_id) REFERENCES articles (id)
);

INSERT INTO alembic_version (version_num) VALUES ('7b5e15d74e3f') RETURNING alembic_version.version_num;

COMMIT;

