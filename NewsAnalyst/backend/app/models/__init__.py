# Import all models here so Alembic can discover them for migrations.
# The order matters: independent models first, then models with foreign keys.
from app.models.user import User
from app.models.source import Source, FetchLog
from app.models.article import Article, UserSavedArticle
from app.models.category import Category, ArticleCategory
from app.models.vote import ArticleVote
