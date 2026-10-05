(function () {
  const gallery = document.querySelector('.floor-plans');
  if (!gallery) {
    return;
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'plan-viewer';
  dialog.setAttribute('aria-label', 'Enlarged floor plan');
  dialog.innerHTML = [
    '<div class="plan-viewer-toolbar">',
    '<button type="button" data-action="zoom-out" aria-label="Zoom out">−</button>',
    '<output aria-live="polite">100%</output>',
    '<button type="button" data-action="zoom-in" aria-label="Zoom in">+</button>',
    '<a data-action="original" target="_blank" rel="noopener">Open original</a>',
    '<button type="button" data-action="close" aria-label="Close enlarged image">Close</button>',
    '</div>',
    '<div class="plan-viewer-canvas">',
    '<img alt="">',
    '</div>'
  ].join('');
  document.body.append(dialog);

  const viewerImage = dialog.querySelector('img');
  const canvas = dialog.querySelector('.plan-viewer-canvas');
  const zoomOutput = dialog.querySelector('output');
  const originalLink = dialog.querySelector('[data-action="original"]');
  let zoom = 1;
  let trigger = null;

  function updateZoom(nextZoom) {
    zoom = Math.min(3, Math.max(0.5, nextZoom));
    viewerImage.style.width = `${zoom * 100}%`;
    zoomOutput.value = `${Math.round(zoom * 100)}%`;
  }

  function closeViewer() {
    if (dialog.open) {
      dialog.close();
    }
  }

  function openViewer(image) {
    trigger = image;
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt;
    originalLink.href = image.currentSrc || image.src;
    updateZoom(1);
    canvas.scrollTo(0, 0);
    dialog.showModal();
  }

  gallery.querySelectorAll('img').forEach(function (image) {
    image.classList.add('zoomable-plan');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', `${image.alt || 'Floor plan'}. Open enlarged view.`);
    image.addEventListener('click', function () {
      openViewer(image);
    });
    image.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openViewer(image);
      }
    });
  });

  dialog.addEventListener('click', function (event) {
    const action = event.target.closest('[data-action]');
    if (action) {
      const actionName = action.dataset.action;
      if (actionName === 'zoom-in') {
        updateZoom(zoom + 0.25);
      } else if (actionName === 'zoom-out') {
        updateZoom(zoom - 0.25);
      } else if (actionName === 'close') {
        closeViewer();
      }
      return;
    }

    if (event.target === dialog) {
      closeViewer();
    }
  });

  dialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    closeViewer();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      closeViewer();
    }
  });

  dialog.addEventListener('close', function () {
    viewerImage.removeAttribute('src');
    if (trigger) {
      setTimeout(function () {
        trigger.focus();
      }, 0);
    }
  });
})();
