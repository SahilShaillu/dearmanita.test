/* =========================================================
   gallery.js
   Photo gallery configuration, rendering with fallback
   placeholders, and an accessible lightbox with keyboard
   navigation and swipe support.

   >>> TO ADD YOUR OWN PHOTOS <<<
   Edit the `galleryImages` array below. Each entry needs:
     - src: EITHER a path to a square (1:1) image inside
       assets/images/ (e.g. "assets/images/photo-01.jpg") OR a full
       image URL hosted elsewhere (e.g.
       "https://example.com/photos/her-smile.jpg"). Both work exactly
       the same way — mix and match freely within the same array.
     - caption: short text shown under the photo
   Reorder, add, or remove entries freely.

   A note on URLs vs local files: local files in assets/images/ keep
   the whole site working completely offline, which is this project's
   default. A photo loaded from a URL instead needs the visitor to
   have an internet connection when they view the page, and needs
   that URL to keep working indefinitely (a link that gets taken
   down, expires, or requires login will show the "beautiful memory
   will go here" placeholder instead, exactly like a missing local
   file would).
   ========================================================= */

(function () {
  "use strict";

  const galleryImages = [
    { src: "assets/images/photo-01.jpg", caption: "My favourite smile 🥹💖" },
    { src: "assets/images/photo-02.jpg", caption: "Beautiful as always 🦋💗" },
    { src: "assets/images/photo-03.jpg", caption: "That laugh I love 🫶🏻💕" },
    { src: "assets/images/photo-04.jpg", caption: "My favourite part of life 🪷🤍" },
    { src: "assets/images/photo-05.jpg", caption: "A little candid moment 🥰🌷" },
    { src: "assets/images/photo-06.jpg", caption: "One of my favourite days 🌸✨" },
    { src: "assets/images/photo-07.jpg", caption: "Just you 🧸💞" },
    { src: "assets/images/photo-08.jpg", caption: "Golden hour, golden girl 💛✨" }
  ];

  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  let validImages = []; // tracks which slots successfully loaded, for lightbox nav

  function buildGallery() {
    galleryImages.forEach((item, index) => {
      const cell = document.createElement("div");
      cell.className = "gallery-item";
      cell.setAttribute("role", "listitem");
      cell.setAttribute("tabindex", "0");
      cell.dataset.index = index;

      // The frame clips the slow continuous zoom (Ken Burns effect)
      // that gives the gallery some life instead of static photos.
      // Each item gets a slightly different duration/delay so they
      // don't all breathe in sync.
      const frame = document.createElement("div");
      frame.className = "gallery-item__frame";
      frame.style.setProperty("--kb-duration", (12 + Math.random() * 6).toFixed(1) + "s");
      frame.style.setProperty("--kb-delay", (Math.random() * -8).toFixed(1) + "s");
      cell.style.setProperty("--float-duration", (4.5 + Math.random() * 2).toFixed(1) + "s");
      cell.style.setProperty("--float-delay", (Math.random() * -3).toFixed(1) + "s");

      const img = document.createElement("img");
      img.alt = item.caption || ("Memory " + (index + 1));
      img.decoding = "async";
      // Avoids sending this page's URL as a referrer to third-party
      // image hosts when `src` is an external URL rather than a local
      // file — harmless for local files, a small privacy courtesy for
      // remote ones.
      img.referrerPolicy = "no-referrer";
      // The image is attached to the DOM immediately (rather than
      // waiting for a 'load' event to insert it) so the browser can
      // load it normally. Building it off-DOM with loading="lazy"
      // previously left it stuck pending forever in some browsers,
      // which is what showed up as permanently blank boxes.
      img.src = item.src;
      frame.appendChild(img);

      // Assume success optimistically so the lightbox works even if
      // the user clicks a tile before the network request resolves;
      // the error handler below corrects this if the image is
      // actually missing.
      validImages[index] = { src: item.src, caption: item.caption };

      img.addEventListener("load", () => {
        const cap = document.createElement("span");
        cap.className = "gallery-item__caption";
        cap.textContent = item.caption || "";
        cell.appendChild(cap);
      }, { once: true });

      img.addEventListener("error", () => {
        frame.remove();
        const placeholder = document.createElement("div");
        placeholder.className = "gallery-item__placeholder";
        placeholder.textContent = "A beautiful memory will go here ❤️";
        cell.appendChild(placeholder);
        cell.classList.add("is-placeholder");
        validImages[index] = null;
      }, { once: true });

      cell.appendChild(frame);

      cell.addEventListener("click", () => openLightbox(index));
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(index);
        }
      });

      grid.appendChild(cell);
    });
  }

  buildGallery();

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  let currentIndex = 0;
  let lastFocusedEl = null;

  function openLightbox(index) {
    if (!validImages[index]) return; // skip broken images
    currentIndex = index;
    updateLightbox();
    lastFocusedEl = document.activeElement;
    lightbox.hidden = false;
    lightboxClose.focus();
    document.addEventListener("keydown", handleLightboxKeys);
  }

  function updateLightbox() {
    const item = validImages[currentIndex];
    if (!item) return;
    lightboxImg.src = item.src;
    lightboxImg.alt = item.caption || "";
    lightboxCaption.textContent = item.caption || "";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.removeEventListener("keydown", handleLightboxKeys);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  function showNext(step) {
    const total = galleryImages.length;
    let next = currentIndex;
    for (let i = 0; i < total; i++) {
      next = (next + step + total) % total;
      if (validImages[next]) break;
    }
    currentIndex = next;
    updateLightbox();
  }

  function handleLightboxKeys(e) {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") showNext(1);
    if (e.key === "ArrowLeft") showNext(-1);
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxNext.addEventListener("click", () => showNext(1));
  lightboxPrev.addEventListener("click", () => showNext(-1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  /* Swipe support */
  let touchStartX = 0;
  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) showNext(dx < 0 ? 1 : -1);
  }, { passive: true });
})();
