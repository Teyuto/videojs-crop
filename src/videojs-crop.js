(function (videojs) {
  var Plugin = videojs.getPlugin('plugin');

  class CropPlugin extends Plugin {
    constructor(player, options) {
      super(player, options);
      this.options = videojs.mergeOptions({}, options);
      this.initialize();
    }

    initialize() {
      const player = this.player;
      player.addClass('video-js-crop');
      const aspectRatios = this.options.aspectRatios || ['16:9'];

      this.cropOverlay = document.createElement('div');
      this.cropOverlay.className = 'video-js-crop-overlay';
      player.el().appendChild(this.cropOverlay);

      this.cropControls = document.createElement('div');
      this.cropControls.className = 'video-js-crop-controls';
      player.el().appendChild(this.cropControls);

      this.createAspectRatioButtons(aspectRatios);
      this.createCancelButton();
      this.setupVideoMove();

      player.on('loadedmetadata', () => {
        this.updateOverlay();
      });

      window.addEventListener('resize', () => {
        this.updateOverlay();
      });

      if (this.options.defaultAspectRatio) {
        setTimeout(() => {this.setAspectRatio(this.options.defaultAspectRatio)}, 300);
      }
    }

    createAspectRatioButtons(aspectRatios) {
      aspectRatios.forEach(ratio => {
        const button = document.createElement('button');
        button.textContent = ratio;
        button.addEventListener('click', () => this.setAspectRatio(ratio));
        this.cropControls.appendChild(button);
        button.classList.add('aspect-ratio-button');
      });
    }

    createCancelButton() {
      const button = document.createElement('button');
      button.textContent = 'Cancel Crop';
      button.addEventListener('click', () => this.cancelCrop());
      this.cropControls.appendChild(button);
    }

    setAspectRatio(ratio) {
      const [w, h] = ratio.split(':').map(Number);
      this.aspectRatio = w / h;
      this.updateOverlay();
      this.triggerCallback();

      const buttons = this.cropControls.querySelectorAll('.aspect-ratio-button');
      buttons.forEach(btn => btn.classList.remove('active'));
      const activeButton = [...buttons].find(btn => btn.textContent === ratio);
      if (activeButton) {
        activeButton.classList.add('active');
      }
    }

    cancelCrop() {
      this.aspectRatio = null;
      this.cropOverlay.style.display = 'none';
      this.triggerCallback();

      const buttons = this.cropControls.querySelectorAll('.aspect-ratio-button');
      buttons.forEach(btn => btn.classList.remove('active'));
    }


    updateOverlay() {
      if (!this.aspectRatio) return;

      const player = this.player;
      const videoWidth = player.videoWidth();
      const videoHeight = player.videoHeight();
      var playerWidth = player.width();
      var playerHeight = player.height();
      if(player.width() == 0 || player.height() == 0){
        playerWidth = player.el().clientWidth;
        playerHeight = player.el().clientHeight;
      }

      let overlayWidth, overlayHeight;

      if (videoWidth / videoHeight > this.aspectRatio) {
        overlayHeight = playerHeight;
        overlayWidth = overlayHeight * this.aspectRatio;
      } else {
        overlayWidth = playerWidth;
        overlayHeight = overlayWidth / this.aspectRatio;
      }

      this.cropOverlay.style.width = `${overlayWidth}px`;
      this.cropOverlay.style.height = `${overlayHeight}px`;
      this.cropOverlay.style.left = `${(playerWidth - overlayWidth) / 2}px`;
      this.cropOverlay.style.top = `${(playerHeight - overlayHeight) / 2}px`;
      this.cropOverlay.style.display = 'block';
    }

    setupVideoMove() {
      let isDragging = false;
      let startX, startY;

      this.cropOverlay.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        this.cropOverlay.style.cursor = 'move';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const overlayRect = this.cropOverlay.getBoundingClientRect();
        const playerRect = this.player.el().getBoundingClientRect();

        let left = overlayRect.left + dx - playerRect.left;
        let top = overlayRect.top + dy - playerRect.top;

        left = Math.max(0, Math.min(left, playerRect.width - overlayRect.width));
        top = Math.max(0, Math.min(top, playerRect.height - overlayRect.height));

        this.cropOverlay.style.left = `${left}px`;
        this.cropOverlay.style.top = `${top}px`;

        startX = e.clientX;
        startY = e.clientY;

        this.triggerCallback();
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
        this.cropOverlay.style.cursor = 'default';
      });
    }

    triggerCallback() {
      if (this.options.onCropChange) {
        const overlayRect = this.cropOverlay.getBoundingClientRect();
        const playerRect = this.player.el().getBoundingClientRect();
        const videoWidth = this.player.videoWidth();
        const videoHeight = this.player.videoHeight();

        const cropParams = {
          aspectRatio: {
            real: this.aspectRatio,
            string: this.getSelectedAspectRatio()
          },
          position: {
            player: {
              w: parseFloat(overlayRect.width.toFixed(2)),
              h: parseFloat(overlayRect.height.toFixed(2)),
              x: parseFloat((overlayRect.left - playerRect.left).toFixed(2)),
              y: parseFloat((overlayRect.top - playerRect.top).toFixed(2))
            },
            video: {
              w: parseFloat((overlayRect.width * (videoWidth / playerRect.width)).toFixed(2)),
              h: parseFloat((overlayRect.height * (videoHeight / playerRect.height)).toFixed(2)),
              x: parseFloat(((overlayRect.left - playerRect.left) * (videoWidth / playerRect.width)).toFixed(2)),
              y: parseFloat(((overlayRect.top - playerRect.top) * (videoHeight / playerRect.height)).toFixed(2))
            }
          }
        };

        if (!this.aspectRatio) {
          cropParams.position.video = { x: null, y: null, w: null, h: null };
          cropParams.position.player = { x: null, y: null, w: null, h: null };
        }

        this.options.onCropChange(cropParams);
      }
    }

    getSelectedAspectRatio() {
      const aspectRatios = this.options.aspectRatios || [];
      for (const ratio of aspectRatios) {
        if (this.aspectRatio === parseFloat(ratio.split(':')[0]) / parseFloat(ratio.split(':')[1])) {
          return ratio;
        }
      }
      return null;
    }
  }

  videojs.registerPlugin('cropPlugin', CropPlugin);
})(videojs);