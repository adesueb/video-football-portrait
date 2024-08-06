document.addEventListener("DOMContentLoaded", function() {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    const resultContainer = document.getElementById('result-container');
    const resultPreview = document.getElementById('result-preview');
    let videoClips = [];

    // Hide result container initially
    resultContainer.style.display = 'none';

    document.querySelectorAll('.add-to-timeline').forEach(button => {
        button.addEventListener('click', async function() {
            const videoItem = this.closest('.video-item');
            const filename = videoItem.getAttribute('data-filename');
            const videoSrc = videoItem.querySelector('video').getAttribute('src');
            const videoUrl = new URL(videoSrc, window.location.origin).href;

            const timelineVideoContainer = document.createElement('div');
            timelineVideoContainer.className = 'timeline-video-container';
            const loadingPlaceholder = document.createElement('div');
            loadingPlaceholder.className = 'loading-placeholder';
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-button';
            removeButton.innerText = 'X';
            removeButton.addEventListener('click', function() {
                timelineVideoContainer.remove();
                videoClips = videoClips.filter(clip => clip.filename !== filename);
            });

            timelineVideoContainer.appendChild(loadingPlaceholder);
            timelineVideoContainer.appendChild(removeButton);
            document.getElementById('clips').appendChild(timelineVideoContainer);

            try {
                if (!ffmpeg.isLoaded()) await ffmpeg.load();
                const thumbnail = await generateThumbnail(videoUrl);

                const timelineImage = document.createElement('img');
                timelineImage.setAttribute('src', thumbnail);
                timelineImage.setAttribute('data-filename', filename);
                loadingPlaceholder.replaceWith(timelineImage);

                videoClips.push({ filename, url: videoUrl });
            } catch (error) {
                console.error('Error generating thumbnail:', error);
                alert('Error generating thumbnail: ' + error.message);
                loadingPlaceholder.remove();
            }
        });
    });

    // Initialize SortableJS
    new Sortable(document.getElementById('clips'), {
        animation: 150,
        onEnd: function() {
            videoClips = Array.from(document.getElementById('clips').querySelectorAll('img')).map(img => {
                return { filename: img.getAttribute('data-filename'), url: img.getAttribute('src') };
            });
        }
    });

    document.getElementById('merge-button').addEventListener('click', async function() {
        if (videoClips.length < 2) {
            alert('Please add at least two video clips to merge.');
            return;
        }

        try {
            if (!ffmpeg.isLoaded()) await ffmpeg.load();

            // Load each video clip into ffmpeg
            for (let i = 0; i < videoClips.length; i++) {
                const videoData = await fetchFile(videoClips[i].url);
                ffmpeg.FS('writeFile', `input${i}.mp4`, videoData);
            }

            // Create a text file for ffmpeg to concatenate the videos
            const fileList = videoClips.map((clip, index) => `file 'input${index}.mp4'`).join('\n');
            ffmpeg.FS('writeFile', 'fileList.txt', new TextEncoder().encode(fileList));

            // Run the ffmpeg command to concatenate videos
            await ffmpeg.run('-f', 'concat', '-safe', '0', '-i', 'fileList.txt', '-c', 'copy', 'output.mp4');
            const data = ffmpeg.FS('readFile', 'output.mp4');

            // Create a URL for the merged video
            const mergedVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });
            const mergedVideoUrl = URL.createObjectURL(mergedVideoBlob);

            // Show result container and preview the merged video
            resultContainer.style.display = 'block';
            resultPreview.setAttribute('src', mergedVideoUrl);
        } catch (error) {
            console.error('Error merging videos:', error);
            alert('Error merging videos: ' + error.message);
        }
    });

    async function generateThumbnail(videoUrl) {
        const videoData = await fetchFile(videoUrl);
        ffmpeg.FS('writeFile', 'input.mp4', videoData);
        await ffmpeg.run('-i', 'input.mp4', '-ss', '00:00:01.000', '-vframes', '1', 'thumbnail.jpg');
        const data = ffmpeg.FS('readFile', 'thumbnail.jpg');

        const blob = new Blob([data.buffer], { type: 'image/jpeg' });
        return URL.createObjectURL(blob);
    }
});
