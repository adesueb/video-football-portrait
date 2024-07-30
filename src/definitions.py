from dataclasses import dataclass
import os
from typing import List

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

@dataclass
class Context:
    name: str
    objects: List[str]
    minimal_object_matched: int
    
# Context Objects

THRESHOLD_OBJECT_COUNT_MATCH = 2 # default




object_white_listed = ['Ball']
