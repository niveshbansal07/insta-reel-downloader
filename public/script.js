const downloadBtn = document.getElementById('downloadBtn');
const reelUrl = document.getElementById('reelUrl');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const videoPreview = document.getElementById('videoPreview');

downloadBtn.addEventListener('click', () => {
    const url = reelUrl.value.trim();
    
    // URL validation: basic Instagram reel pattern
    if (!url || !/^https:\/\/(www\.)?instagram\.com\/reel\//.test(url)) {
        progressText.textContent = 'Please enter a valid Instagram reel URL.';
        return;
    }

    // Disable button while processing
    downloadBtn.disabled = true;

    // Reset progress & preview
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting download...';
    videoPreview.style.display = 'none';
    videoPreview.src = '';

    // Optional: fake progress animation
    let width = 0;
    const interval = setInterval(() => {
        if(width >= 90) {
            clearInterval(interval);
        } else {
            width += 1;
            progressBar.style.width = width + '%';
        }
    }, 200);

    // Backend request
    fetch('/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    })
    .then(res => res.json())
    .then(data => {
        clearInterval(interval);
        if(data.success && data.downloadUrl){
            // Show video preview
            videoPreview.src = data.downloadUrl;
            videoPreview.style.display = 'block';

            progressBar.style.width = '100%';
            progressText.textContent = 'Download ready! Click play or right-click → Save As.';
        } else {
            progressBar.style.width = '0%';
            progressText.textContent = 'Error: ' + (data.message || 'Something went wrong!');
        }
    })
    .catch(err => {
        clearInterval(interval);
        progressBar.style.width = '0%';
        progressText.textContent = 'Download failed! Please try again.';
        console.error(err);
    })
    .finally(() => {
        // Re-enable button
        downloadBtn.disabled = false;
    });
});
