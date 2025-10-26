/**
 * Main entry point for Echoes of the Verdict
 */

// Hide loading screen and start game
document.addEventListener('DOMContentLoaded', () => {
  const loadingElement = document.getElementById('loading');
  const loadingProgress = document.getElementById('loading-progress');

  // Simulate loading for now
  let progress = 0;
  const loadingInterval = setInterval(() => {
    progress += 10;
    loadingProgress.textContent = `${progress}%`;

    if (progress >= 100) {
      clearInterval(loadingInterval);
      loadingElement.classList.add('hidden');
      console.log('Game initialized');
      console.log('Echoes of the Verdict - Development Build');
      console.log('Phase 0: Bootstrap Complete');
      console.log('Ready for engine implementation...');
    }
  }, 100);
});
