chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('main.html', {
    'width': 480,
    'height': 480 + 20
  });
});
