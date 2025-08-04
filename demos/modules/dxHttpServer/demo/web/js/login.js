
$(function() {
  // Check if already logged in
  const token = sessionStorage.getItem('token');
  if (token) {
    // Verify if token is valid
    $.ajax({
      url: '/api/verify',
      method: 'GET',
      headers: {
        'Authorization': token
      },
      success: function(res) {
        if (res.code === 0) {
          window.location.href = './pages/config.html';
        } else {
          // Invalid token, clear stored login info
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('username');
          sessionStorage.removeItem('role');
        }
      },
      error: function() {
        // Token verification failed, clear stored login info
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('role');
      }
    });
  }

  $('#login-form').on('submit', function(e) {
    e.preventDefault();
    
    const username = $('#username').val().trim();
    const password = $('#password').val().trim();
    
    // Form validation
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }

    // Show loading state
    const submitBtn = $(this).find('button[type="submit"]');
    const originalText = submitBtn.text();
    submitBtn.prop('disabled', true).text('Logging in...');
    
    // Send login request
    $.ajax({
      url: '/api/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        username: username,
        password: md5(password)
      }),
      success: function(res) {
        if (res.code === 0) {
          // Login successful, save token and user info
          sessionStorage.setItem('token', res.data.token);
          sessionStorage.setItem('userInfo', JSON.stringify(res.data));
          sessionStorage.setItem('role', res.data.role);
          
          // Redirect to config page
          window.location.href = './pages/config.html';
        } else {
          // Show error message
          alert(res.message || 'Login failed');
          submitBtn.prop('disabled', false).text(originalText);
        }
      },
      error: function(xhr) {
        // Handle error cases
        let errorMessage = 'Login failed, please try again later';
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        }
        alert(errorMessage);
        submitBtn.prop('disabled', false).text(originalText);
      }
    });
  });

  // Password input enter key event
  $('#password').on('keypress', function(e) {
    if (e.which === 13) {
      $('#login-form').submit();
    }
  });
}); 