document.addEventListener("DOMContentLoaded", function() {
    const { createFFmpeg, fetchFile } = FFmpeg;
    const ffmpeg = createFFmpeg({ log: true });
    const resultContainer = document.getElementById('result-container');
    const resultPreview = document.getElementById('result-preview');
    let videoClips = [];
    let activeTrimContainer = null;

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
                updateThumbnailPositions();
            });

            timelineVideoContainer.appendChild(loadingPlaceholder);
            timelineVideoContainer.appendChild(removeButton);
            document.getElementById('clips').appendChild(timelineVideoContainer);

            try {
                if (!ffmpeg.isLoaded()) await ffmpeg.load();
                const thumbnail = await generateThumbnail(videoUrl);
                const duration = await getVideoDuration(videoUrl);

                const timelineImage = document.createElement('img');
                timelineImage.setAttribute('src', thumbnail);
                timelineImage.setAttribute('data-filename', filename);
                timelineImage.style.width = `${duration * 10}px`; // Adjust width based on video length
                loadingPlaceholder.replaceWith(timelineImage);

                const clip = { filename, url: videoUrl, start: 0, end: duration, duration: duration };
                videoClips.push(clip);

                // Create custom range slider for trimming
                const trimContainer = document.createElement('div');
                trimContainer.className = 'trim-container';

                const startHandle = document.createElement('div');
                startHandle.className = 'trim-handle start-handle';

                const endHandle = document.createElement('div');
                endHandle.className = 'trim-handle end-handle';

                trimContainer.appendChild(startHandle);
                trimContainer.appendChild(endHandle);
                timelineVideoContainer.appendChild(trimContainer);

                let isDraggingStart = false;
                let isDraggingEnd = false;
                let isDragging = false;

                // Hide trim handles initially
                trimContainer.style.display = 'none';

                timelineImage.addEventListener('click', (event) => {
                    if (!isDragging) {
                        event.stopPropagation();
                        if (trimContainer.style.display === 'none') {
                            if (activeTrimContainer) {
                                activeTrimContainer.style.display = 'none';
                                sortable.option('disabled', false);  // Enable drag-and-drop reorder
                            }
                            trimContainer.style.display = 'flex';
                            const newWidth = (clip.end - clip.start) * 10;
                            startHandle.style.left = `0px`;
                            endHandle.style.left = `${newWidth - endHandle.offsetWidth}px`; // Adjust to end exactly at the image
                            activeTrimContainer = trimContainer;
                            sortable.option('disabled', true);  // Disable drag-and-drop reorder
                        } else {
                            trimContainer.style.display = 'none';
                            activeTrimContainer = null;
                            sortable.option('disabled', false);  // Enable drag-and-drop reorder
                        }
                    }
                });

                startHandle.addEventListener('mousedown', (event) => {
                    event.stopPropagation();
                    isDraggingStart = true;
                    isDragging = false;
                });

                endHandle.addEventListener('mousedown', (event) => {
                    event.stopPropagation();
                    isDraggingEnd = true;
                    isDragging = false;
                });

                document.addEventListener('mousemove', (event) => {
                    if (isDraggingStart || isDraggingEnd) {
                        isDragging = true;
                    }
                    if (isDraggingStart) {
                        const newStart = Math.max(0, Math.min(event.clientX - timelineVideoContainer.offsetLeft, clip.end * 10));
                        clip.start = newStart / 10;
                        const newWidth = (clip.end - clip.start) * 10;
                        timelineImage.style.width = `${newWidth}px`;
                        trimContainer.style.width = `${newWidth}px`;
                        startHandle.style.left = `0px`;
                        endHandle.style.left = `${newWidth - endHandle.offsetWidth}px`; // Adjust to end exactly at the image
                    } else if (isDraggingEnd) {
                        const newEnd = Math.min(clip.duration * 10, Math.max(event.clientX - timelineVideoContainer.offsetLeft, clip.start * 10));
                        clip.end = newEnd / 10;
                        const newWidth = (clip.end - clip.start) * 10;
                        timelineImage.style.width = `${newWidth}px`;
                        trimContainer.style.width = `${newWidth}px`;
                        endHandle.style.left = `${newWidth - endHandle.offsetWidth}px`; // Adjust to end exactly at the image
                    }
                });

                document.addEventListener('mouseup', () => {
                    isDraggingStart = false;
                    isDraggingEnd = false;
                    isDragging = false;
                });

                updateThumbnailPositions();

            } catch (error) {
                console.error('Error generating thumbnail:', error);
                alert('Error generating thumbnail: ' + error.message);
                loadingPlaceholder.remove();
            }
        });
    });

    // Initialize SortableJS
    const sortable = new Sortable(document.getElementById('clips'), {
        animation: 150,
        onEnd: function() {
            videoClips = Array.from(document.getElementById('clips').querySelectorAll('.timeline-video-container')).map(container => {
                const img = container.querySelector('img');
                return videoClips.find(clip => clip.filename === img.getAttribute('data-filename'));
            });
            updateThumbnailPositions();  // Update positions after reorder
        }
    });

    document.getElementById('merge-button').addEventListener('click', async function() {
        if (videoClips.length < 2) {
            alert('Please add at least two video clips to merge.');
            return;
        }

        try {
            if (!ffmpeg.isLoaded()) await ffmpeg.load();

            // Trim each video clip according to the start and end times
            for (let i = 0; i < videoClips.length; i++) {
                const videoData = await fetchFile(videoClips[i].url);
                ffmpeg.FS('writeFile', `input${i}.mp4`, videoData);
                await ffmpeg.run('-i', `input${i}.mp4`, '-ss', videoClips[i].start.toString(), '-to', videoClips[i].end.toString(), '-c', 'copy', `trimmed${i}.mp4`);
            }

            // Create a text file for ffmpeg to concatenate the videos
            const fileList = videoClips.map((clip, index) => `file 'trimmed${index}.mp4'`).join('\n');
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

    async function getVideoDuration(videoUrl) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.addEventListener('loadedmetadata', () => {
                resolve(video.duration);
            });
            video.addEventListener('error', (e) => reject(e));
        });
    }

    document.addEventListener('click', (event) => {
        if (activeTrimContainer && !activeTrimContainer.contains(event.target)) {
            activeTrimContainer.style.display = 'none';
            activeTrimContainer = null;
            sortable.option('disabled', false);  // Enable drag-and-drop reorder
        }
    });

    function updateThumbnailPositions() {
        const thumbnails = document.querySelectorAll('.timeline-video-container img');
        thumbnails.forEach((thumbnail, index) => {
            const clip = videoClips[index];
            const startOffset = clip.start * 10;
            const endOffset = clip.end * 10;
            const width = endOffset - startOffset;
            thumbnail.style.width = `${width}px`;
            const trimContainer = thumbnail.parentElement.querySelector('.trim-container');
            trimContainer.style.width = `${width}px`;
            const endHandle = trimContainer.querySelector('.end-handle');
            endHandle.style.left = `${width - endHandle.offsetWidth}px`; // Adjust to end exactly at the image
        });
    }
});
