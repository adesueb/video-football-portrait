import subprocess


def extract_audio(input_video_path, output_audio_path):
    command = [
        'ffmpeg', '-i', input_video_path,
        '-q:a', '0', '-map', 'a', '-y', output_audio_path
    ]
    subprocess.run(command, check=True)


def combine_audio_video(input_video_path, input_audio_path, output_video_path):
    command = [
        'ffmpeg', '-i', input_video_path,
        '-i', input_audio_path,
        '-c:v', 'copy', '-c:a', 'aac',
        '-strict', 'experimental', '-y', output_video_path
    ]
    subprocess.run(command, check=True)
