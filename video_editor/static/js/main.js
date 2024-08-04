document.addEventListener('DOMContentLoaded', () => {
  const clipList = document.getElementById('timeline');
  const availableScenes = document.getElementById('available-scenes');
  const saveEditsButton = document.getElementById('save-edits');
  const resultContainer = document.getElementById('result-container');
  const resultVideo = document.getElementById('result-video');
  const resultVideoSource = document.getElementById('result-video-source');

  // Function to create a new scene element
  function createSceneElement(filename) {
    const sceneLi = document.createElement('li');
    sceneLi.classList.add('list-group-item', 'scene-item');
    sceneLi.setAttribute('draggable', 'true');

    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');
    const videoPreview = document.createElement('video');
    videoPreview.controls = false;
    videoPreview.classList.add('video-preview');
    const source = document.createElement('source');
    source.src = `/static/uploads/${filename}`;
    source.type = 'video/mp4';
    videoPreview.appendChild(source);

    const filenameInput = document.createElement('input');
    filenameInput.setAttribute('type', 'hidden');
    filenameInput.setAttribute('name', 'filename');
    filenameInput.setAttribute('value', filename);

    const addButton = document.createElement('button');
    addButton.innerText = 'Add';
    addButton.classList.add('btn', 'btn-primary', 'btn-sm', 'mt-2');
    addButton.addEventListener('click', () => {
      createClipElement(filename);
    });

    sceneLi.appendChild(videoContainer);
    videoContainer.appendChild(videoPreview);
    sceneLi.appendChild(filenameInput);
    sceneLi.appendChild(addButton);

    availableScenes.appendChild(sceneLi);

    videoPreview.addEventListener('loadedmetadata', () => {
      sceneLi.style.width = (videoPreview.duration * 10) + 'px'; // Adjust the multiplier as needed
    });

    videoPreview.addEventListener('error', () => {
      console.error(`Error loading video: ${filename}`);
      alert(`Error loading video: ${filename}`);
    });
  }

  // Function to create a new clip element
  function createClipElement(filename) {
    const clipDiv = document.createElement('div');
    clipDiv.classList.add('clip');
    clipDiv.setAttribute('draggable', 'true');

    const videoContainer = document.createElement('div');
    videoContainer.classList.add('video-container');
    const videoPreview = document.createElement('video');
    videoPreview.controls = false;
    videoPreview.classList.add('video-preview');
    const source = document.createElement('source');
    source.src = `/static/uploads/${filename}`;
    source.type = 'video/mp4';
    videoPreview.appendChild(source);

    const filenameInput = document.createElement('input');
    filenameInput.setAttribute('type', 'hidden');
    filenameInput.setAttribute('name', 'filename');
    filenameInput.setAttribute('value', filename);

    const startLabel = document.createElement('label');
    startLabel.innerText = 'Start time:';

    const startInput = document.createElement('input');
    startInput.setAttribute('type', 'range');
    startInput.setAttribute('name', 'start');
    startInput.setAttribute('min', '0');
    startInput.setAttribute('step', '0.1');
    startInput.setAttribute('value', '0');
    startInput.classList.add('slider');
    startInput.addEventListener('input', () => updateVideoPreview(startInput, endInput, videoPreview));

    const endLabel = document.createElement('label');
    endLabel.innerText = 'End time:';

    const endInput = document.createElement('input');
    endInput.setAttribute('type', 'range');
    endInput.setAttribute('name', 'end');
    endInput.setAttribute('min', '0');
    endInput.setAttribute('step', '0.1');
    endInput.setAttribute('value', '10'); // Default value, should be updated based on video duration
    endInput.classList.add('slider');
    endInput.addEventListener('input', () => updateVideoPreview(startInput, endInput, videoPreview));

    const startValue = document.createElement('span');
    startValue.innerText = startInput.value;
    startValue.classList.add('value-display');

    const endValue = document.createElement('span');
    endValue.innerText = endInput.value;
    endValue.classList.add('value-display');

    startInput.addEventListener('input', () => {
      startValue.innerText = startInput.value;
    });

    endInput.addEventListener('input', () => {
      endValue.innerText = endInput.value;
    });

    const removeButton = document.createElement('button');
    removeButton.innerText = 'Remove';
    removeButton.classList.add('btn', 'btn-danger', 'btn-sm', 'mt-2');
    removeButton.addEventListener('click', () => {
      clipDiv.remove();
    });

    const sliderContainer = document.createElement('div');
    sliderContainer.classList.add('slider-container');

    sliderContainer.appendChild(startLabel);
    sliderContainer.appendChild(startInput);
    sliderContainer.appendChild(startValue);
    sliderContainer.appendChild(endLabel);
    sliderContainer.appendChild(endInput);
    sliderContainer.appendChild(endValue);

    clipDiv.appendChild(videoContainer);
    videoContainer.appendChild(videoPreview);
    clipDiv.appendChild(filenameInput);
    clipDiv.appendChild(sliderContainer);
    clipDiv.appendChild(removeButton);

    clipList.appendChild(clipDiv);

    // Update the maximum value for the sliders based on the video duration
    videoPreview.addEventListener('loadedmetadata', () => {
      startInput.setAttribute('max', videoPreview.duration);
      endInput.setAttribute('max', videoPreview.duration);
      endInput.setAttribute('value', videoPreview.duration);
      endValue.innerText = videoPreview.duration;
      clipDiv.style.width = (videoPreview.duration * 10) + 'px'; // Adjust the multiplier as needed
    });

    videoPreview.addEventListener('error', () => {
      console.error(`Error loading video: ${filename}`);
      alert(`Error loading video: ${filename}`);
    });

    // Add hover effect
    clipDiv.addEventListener('mouseenter', () => {
      clipDiv.classList.add('highlight');
    });

    clipDiv.addEventListener('mouseleave', () => {
      clipDiv.classList.remove('highlight');
    });
  }

  // Function to update video preview based on slider values
  function updateVideoPreview(startInput, endInput, videoPreview) {
    const startTime = parseFloat(startInput.value);
    const endTime = parseFloat(endInput.value);
    videoPreview.currentTime = startTime;
    videoPreview.play();

    const timeUpdateHandler = () => {
      if (videoPreview.currentTime >= endTime) {
        videoPreview.pause();
        videoPreview.removeEventListener('timeupdate', timeUpdateHandler);
      }
    };

    videoPreview.addEventListener('timeupdate', timeUpdateHandler);
  }

  // Add scene elements for each uploaded video
  filenames.forEach(filename => {
    createSceneElement(filename);
  });

  // Enable jQuery UI sortable for drag-and-drop functionality
  $("#available-scenes, #timeline").sortable({
    connectWith: ".list-group",
    helper: "clone",
    stop: function(event, ui) {
      if (ui.item.parent().attr('id') === 'timeline') {
        createClipElement(ui.item.find("input[name='filename']").val());
        ui.item.remove();
      }
    }
  }).disableSelection();

  // Save edits button click handler
  saveEditsButton.addEventListener('click', () => {
    const clips = [];
    const clipElements = clipList.getElementsByClassName('clip');
    for (let clipElement of clipElements) {
      const filename = clipElement.querySelector("input[name='filename']").value;
      const start = clipElement.querySelector("input[name='start']").value;
      const end = clipElement.querySelector("input[name='end']").value;
      clips.push({ filename, start, end });
    }

    $.ajax({
      url: '/edit_ajax',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ clips }),
      success: function(response) {
        resultVideoSource.src = `/static/edited/${response.result_video}`;
        resultVideo.load();
        resultContainer.style.display = 'block';
      },
      error: function(xhr, status, error) {
        alert('Error saving edits: ' + error);
      }
    });
  });
});
