import os

UPLOAD_FOLDER = 'static/uploads/'
EDITED_FOLDER = 'static/edited/'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
