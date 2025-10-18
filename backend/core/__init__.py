# Create the core directory if it doesn't exist
New-Item -ItemType Directory -Path "backend\core" -Force

# Create __init__.py
@"
"""
FORGE Core - Intelligent Agent Components
"""

from .vision import Vision
from .brain import Brain
from .hands import Hands

__all__ = ['Vision', 'Brain', 'Hands']
"@ | Out-File -FilePath "backend\core\__init__.py" -Encoding UTF8