// Shown while the local server starts. The desktop shell calls rboShowError(message) if it cannot.
window.rboShowError = (message) => {
  document.getElementById('status').hidden = true;
  document.getElementById('error-text').textContent = String(message || 'The local server stopped unexpectedly.');
  document.getElementById('error').hidden = false;
};
