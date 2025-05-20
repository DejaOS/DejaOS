$(function() {
  // Check login status
  function checkLogin() {
    // TODO: In actual project, this should call backend API to check login status
    const token = sessionStorage.getItem('token');
    if (!token) {
      window.location.href = '../index.html';
    } else {
      $('#username').text(JSON.parse(sessionStorage.getItem('userInfo')).username || 'admin');
    }
  }
  function showLoading() {
    $('.loading-container').show();
  }
  function hideLoading() {
    $('.loading-container').hide();
  }

  // Handle logout
  $('#logout').on('click', function() {
    // TODO: In actual project, this should call backend API to logout
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('role');
    window.location.href = '../index.html';
  });

  // Initialize
  checkLogin();
}); 