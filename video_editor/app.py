from flask import Flask, render_template, request, redirect, url_for, jsonify, send_from_directory
import os
from moviepy.editor import VideoFileClip, concatenate_videoclips
from config import UPLOAD_FOLDER, EDITED_FOLDER, allowed_file

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['EDITED_FOLDER'] = EDITED_FOLDER

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'POST':
        files = request.files.getlist('file')
        if not files or files[0].filename == '':
            return redirect(request.url)
        filenames = []
        for file in files:
            if file and allowed_file(file.filename):
                filename = file.filename
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                filenames.append(filename)
        return redirect(url_for('edit', filenames=','.join(filenames)))
    return render_template('upload.html')

@app.route('/edit/<filenames>')
def edit(filenames):
    filenames = filenames.split(',')
    return render_template('edit.html', filenames=filenames, result_video=None)

@app.route('/edit_ajax', methods=['POST'])
def edit_ajax():
    data = request.get_json()
    clips_data = data.get('clips', [])
    clips = []
    for clip_data in clips_data:
        filename = clip_data['filename']
        start = float(clip_data['start'])
        end = float(clip_data['end'])
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        clip = VideoFileClip(video_path)
        if start < end <= clip.duration:
            clips.append(clip.subclip(start, end))
    if clips:
        final_clip = concatenate_videoclips(clips)
        edited_filename = "edited_combined.mp4"
        final_clip.write_videofile(os.path.join(app.config['EDITED_FOLDER'], edited_filename))
        return jsonify(result_video=edited_filename)
    return jsonify(result_video=None), 400

@app.route('/downloads/<filename>')
def download_file(filename):
    return send_from_directory(app.config['EDITED_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True)
