const pages = [...document.querySelectorAll(".page")];
const dots = [...document.querySelectorAll(".dot")];
const back = document.getElementById("back");
const next = document.getElementById("next");
const status = document.getElementById("page-status");
const current = document.getElementById("current");
let index = 0;

const photoUrls = {
  together: ["media/together.jpg", "media/together.jpeg", "media/together.png", "media/together.webp"],
  "finale-bg": ["media/finale-bg.jpg", "media/finale-bg.jpeg", "media/finale-bg.png", "media/finale-bg.webp"]
};

const videoUrls = ["media/message.mp4", "media/message.webm", "media/message.mov"];

function render() {
  if (!pages[index].classList.contains("page-cake")) clearCelebration();
  pages.forEach((page, i) => {
    const on = i === index;
    page.hidden = !on;
    page.classList.toggle("is-active", on);
    if (on) page.scrollTop = 0;
  });
  dots.forEach((dot, i) => dot.classList.toggle("on", i === index));
  current.textContent = String(index + 1);
  back.disabled = index === 0;
  next.disabled = index === pages.length - 1;
  const title = pages[index].dataset.title;
  status.textContent = `Page ${index + 1} of ${pages.length}. ${title}`;
  document.querySelectorAll("video").forEach((video) => {
    if (!pages[index].contains(video)) video.pause();
  });
}

function go(step) {
  const nextIndex = index + step;
  if (nextIndex < 0 || nextIndex >= pages.length) return;
  index = nextIndex;
  render();
}

back.addEventListener("click", () => go(-1));
next.addEventListener("click", () => go(1));

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") go(1);
  if (event.key === "ArrowLeft") go(-1);
});

let touch = null;
const book = document.getElementById("book");

book.addEventListener("touchstart", (event) => {
  if (event.target.closest("button, input, video, label, a")) return;
  const point = event.changedTouches[0];
  touch = { x: point.clientX, y: point.clientY };
}, { passive: true });

book.addEventListener("touchend", (event) => {
  if (!touch) return;
  const point = event.changedTouches[0];
  const dx = point.clientX - touch.x;
  const dy = point.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
  go(dx < 0 ? 1 : -1);
}, { passive: true });

function matchesCandidate(actual, candidate) {
  return actual === candidate || actual.endsWith("/" + candidate) || actual.endsWith(candidate);
}

function useFirstWorkingImage(img, urls) {
  const frame = img.closest("[data-slot]");
  let cursor = 0;

  function tryNext() {
    if (frame.dataset.preview === "true") return;
    if (cursor >= urls.length) {
      frame.classList.add("empty");
      frame.classList.remove("ready");
      return;
    }
    const candidate = urls[cursor];
    cursor += 1;
    img.onload = () => {
      if (frame.dataset.preview === "true") return;
      if (!matchesCandidate(img.src, candidate)) return;
      frame.classList.add("ready");
      frame.classList.remove("empty");
    };
    img.onerror = () => {
      if (frame.dataset.preview === "true") return;
      if (!matchesCandidate(img.src, candidate) && img.getAttribute("src") !== candidate) return;
      tryNext();
    };
    img.src = candidate;
  }

  tryNext();
}

document.querySelectorAll("img").forEach((img) => {
  const slot = img.closest("[data-slot]");
  if (!slot || !photoUrls[slot.dataset.slot]) return;
  useFirstWorkingImage(img, photoUrls[slot.dataset.slot]);
});

function useFirstWorkingBackground(el, urls) {
  const probe = new Image();
  let cursor = 0;
  probe.onload = () => {
    if (el.dataset.preview === "true") return;
    el.style.backgroundImage = `url("${probe.src}")`;
    el.classList.add("ready");
    el.classList.remove("empty");
  };
  probe.onerror = () => {
    if (el.dataset.preview === "true") return;
    cursor += 1;
    if (cursor >= urls.length) {
      el.classList.add("empty");
      return;
    }
    probe.src = urls[cursor];
  };
  probe.src = urls[0];
}

const finaleBg = document.querySelector('[data-slot="finale-bg"]');
useFirstWorkingBackground(finaleBg, photoUrls["finale-bg"]);

function useFirstWorkingVideo(video, urls) {
  const frame = video.closest("[data-slot]");
  let cursor = 0;

  function tryNext() {
    if (frame.dataset.preview === "true") return;
    if (cursor >= urls.length) {
      frame.classList.add("empty");
      frame.classList.remove("ready");
      return;
    }
    const candidate = urls[cursor];
    cursor += 1;
    video.onloadeddata = () => {
      if (frame.dataset.preview === "true") return;
      if (!matchesCandidate(video.currentSrc || video.src, candidate)) return;
      frame.classList.add("ready");
      frame.classList.remove("empty");
    };
    video.onerror = () => {
      if (frame.dataset.preview === "true") return;
      tryNext();
    };
    video.src = candidate;
  }

  tryNext();
}

const messageVideo = document.querySelector(".video-frame video");
useFirstWorkingVideo(messageVideo, videoUrls);

function applyFile(slot, file) {
  if (!file || slot.dataset.locked === "true") return;
  const isVideo = slot.dataset.slot === "video";
  if (!file.type.startsWith(isVideo ? "video/" : "image/")) return;
  const previousUrl = slot.dataset.objectUrl;
  const url = URL.createObjectURL(file);
  slot.dataset.objectUrl = url;
  slot.dataset.preview = "true";
  const markReady = () => {
    slot.classList.add("ready");
    slot.classList.remove("empty");
    slot.querySelector(".upload > span").textContent = isVideo ? "Change video" : "Change photo";
  };
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  if (isVideo) {
    const video = slot.querySelector("video");
    video.onloadeddata = markReady;
    video.onerror = null;
    video.src = url;
    video.load();
    return;
  }
  if (slot.dataset.slot === "finale-bg") {
    slot.style.backgroundImage = `url("${url}")`;
    markReady();
    return;
  }
  const img = slot.querySelector("img");
  if (img) {
    img.onload = markReady;
    img.onerror = null;
    img.src = url;
  }
}

document.querySelectorAll("[data-slot]").forEach((slot) => {
  if (slot.dataset.locked === "true") return;
  const input = slot.querySelector('input[type="file"]');
  if (input) {
    input.addEventListener("change", () => {
      applyFile(slot, input.files && input.files[0]);
    });
  }

  slot.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    applyFile(slot, event.dataTransfer.files && event.dataTransfer.files[0]);
  });
});

const candles = [...document.querySelectorAll(".candle")];
const cakeHint = document.getElementById("cake-hint");
const relightButton = document.getElementById("relight");
const celebration = document.getElementById("celebration");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const partyColors = ["#d80621", "#ffffff", "#ffd166", "#ff8fab", "#7bdff2", "#c77dff", "#ff9f1c", "#b9fbc0"];

function remainingCandles() {
  return candles.filter((candle) => !candle.classList.contains("out")).length;
}

function updateHint() {
  const left = remainingCandles();
  if (left === 3) cakeHint.textContent = "Tap each candle to blow it out";
  else if (left === 2) cakeHint.textContent = "Two candles still glowing";
  else if (left === 1) cakeHint.textContent = "One candle left";
  else cakeHint.textContent = "Make a wish, Maral";
}

function celebrate() {
  if (document.body.classList.contains("is-celebrating")) return;
  document.body.classList.add("is-celebrating");
  celebration.hidden = false;
  celebration.innerHTML = "";
  celebration.setAttribute("aria-label", "Celebration. Happy birthday, Maral.");

  for (let i = 0; i < 56; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    const end = `${8 + Math.random() * 84}%`;
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--end", end);
    piece.style.setProperty("--spin", `${180 + Math.random() * 540}deg`);
    piece.style.background = partyColors[i % partyColors.length];
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${9 + Math.random() * 12}px`;
    piece.style.borderRadius = Math.random() > 0.55 ? "2px" : "999px";
    piece.style.animationDuration = `${1.6 + Math.random() * 1.8}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    if (reduceMotion) {
      piece.style.animation = "none";
      piece.style.top = end;
    }
    celebration.appendChild(piece);
  }

  for (let i = 0; i < 12; i += 1) {
    const balloon = document.createElement("span");
    balloon.className = "balloon";
    const end = `${6 + Math.random() * 58}%`;
    balloon.style.left = `${4 + Math.random() * 88}%`;
    balloon.style.setProperty("--c", partyColors[i % partyColors.length]);
    balloon.style.setProperty("--end", end);
    balloon.style.animationDuration = `${2.4 + Math.random() * 1.6}s`;
    balloon.style.animationDelay = `${Math.random() * 0.4}s`;
    balloon.addEventListener("animationend", (event) => {
      if (event.animationName !== "balloon-rise") return;
      balloon.style.bottom = end;
      balloon.classList.add("float");
    });
    if (reduceMotion) {
      balloon.style.animation = "none";
      balloon.style.bottom = end;
    }
    celebration.appendChild(balloon);
  }

  for (let i = 0; i < 12; i += 1) {
    const ribbon = document.createElement("span");
    ribbon.className = "ribbon";
    ribbon.style.left = `${Math.random() * 96}%`;
    ribbon.style.setProperty("--c", partyColors[i % partyColors.length]);
    ribbon.style.setProperty("--h", `${28 + Math.random() * 36}vh`);
    ribbon.style.animationDelay = `${Math.random() * 0.25}s`;
    if (reduceMotion) {
      ribbon.style.animation = "none";
      ribbon.style.top = "0";
    }
    celebration.appendChild(ribbon);
  }

  relightButton.hidden = false;
}

candles.forEach((candle) => {
  candle.addEventListener("click", () => {
    if (candle.classList.contains("out")) return;
    candle.classList.add("out");
    candle.setAttribute("aria-pressed", "true");
    updateHint();
    if (remainingCandles() === 0) celebrate();
  });
});

function clearCelebration() {
  document.body.classList.remove("is-celebrating");
  celebration.innerHTML = "";
  celebration.hidden = true;
  celebration.removeAttribute("aria-label");
}

relightButton.addEventListener("click", () => {
  clearCelebration();
  candles.forEach((candle) => {
    candle.classList.remove("out");
    candle.setAttribute("aria-pressed", "false");
  });
  relightButton.hidden = true;
  updateHint();
});

const backgroundMusic = document.getElementById("background-music");
const musicToggle = document.getElementById("music-toggle");
const musicVolume = document.getElementById("music-volume");
const musicStatus = document.getElementById("music-status");
let musicChosen = false;
backgroundMusic.volume = Number(musicVolume.value) / 100;

function updateMusicControl() {
  const playing = !backgroundMusic.paused;
  const label = playing ? "Pause background music" : "Play background music";
  musicToggle.setAttribute("aria-pressed", String(playing));
  musicToggle.setAttribute("aria-label", label);
  musicToggle.title = label;
}

function playMusic() {
  musicStatus.textContent = "";
  backgroundMusic.play().catch(() => {
    musicStatus.textContent = "Music could not start. Press the music button to try again.";
    updateMusicControl();
  });
}

musicToggle.addEventListener("click", () => {
  musicChosen = true;
  if (backgroundMusic.paused) playMusic();
  else backgroundMusic.pause();
});

musicVolume.addEventListener("input", () => {
  backgroundMusic.volume = Number(musicVolume.value) / 100;
});

backgroundMusic.addEventListener("play", updateMusicControl);
backgroundMusic.addEventListener("pause", updateMusicControl);
backgroundMusic.addEventListener("error", () => {
  musicStatus.textContent = "Background music is unavailable.";
  updateMusicControl();
});

function startMusicOnInteraction(event) {
  if (musicChosen || event.target.closest(".music-controls")) return;
  if (event.type === "keydown" && !["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  musicChosen = true;
  playMusic();
}

document.addEventListener("click", startMusicOnInteraction);
document.addEventListener("keydown", startMusicOnInteraction);

render();
