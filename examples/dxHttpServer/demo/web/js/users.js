$(function () {
  let editingUser = null;

  // User management page initialization
  function initUsers () {
    console.log('User management page initialization');
    loadUsers();
    initEventHandlers();
  }

  // Load user list
  function loadUsers () {
    $.ajax({
      url: '/api/userList',
      headers: {
        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
      },
      type: 'GET',
      success: function (response) {
        if (response.code === 0) {
          const users = response.data;
          console.log('Loading user data:', users);
          const tbody = $('#users-table-body');
          tbody.empty();

          users.forEach(user => {
            const tr = $('<tr>');
            tr.append($('<td>').text(user.username));
            tr.append($('<td>').text(user.createTime));

            const actionTd = $('<td>');
            const deleteBtn = $('<button>')
              .addClass('delete-btn')
              .text('Delete')
              .on('click', () => deleteUser(user));

            if (user.role !== 'admin') {
              actionTd.append(deleteBtn);
            }

            tr.append(actionTd);
            tbody.append(tr);
          });
        } else {
          alert(response.message);
        }
      },
      error: function (xhr, status, error) {
        console.error('Failed to load user data:', error);
        alert('Failed to load user data, please try again later');
      }
    });
  }

  // Initialize event handlers
  function initEventHandlers () {
    // Add user button click event
    $('#add-user').on('click', function () {
      showAddDialog();
    });

    // Cancel button click event
    $('#cancel-user').on('click', function () {
      hideDialog();
    });

    // User form submit event
    $('#user-form').on('submit', function (e) {
      e.preventDefault();

      const username = $('#username-input').val().trim();

      if (!username) {
        alert('Username cannot be empty!');
        return;
      }

      $.ajax({
        url: '/api/addUser',
        headers: {
          'Authorization': 'Bearer ' + sessionStorage.getItem('token')
        },
        type: 'POST',
        data: { username },
        success: function (response) {
          if (response.code === 0) {
            alert('Add successful');
            hideDialog();
            loadUsers(); // Reload list
          } else {
            alert(response.message);
          }
        }
      });
    });
  }

  // Show add user dialog
  function showAddDialog () {
    editingUser = null;
    $('.dialog-content h3').text('Add User');
    $('#username-input').val('').prop('disabled', false);
    $('#password-input').val('').prop('required', true);
    $('#user-dialog').show();
  }

  // Hide dialog
  function hideDialog () {
    $('#user-dialog').hide();
    $('#user-form')[0].reset();
    editingUser = null;
  }

  // Delete user
  function deleteUser (user) {
    if (confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      $.ajax({
        url: '/api/deleteUser',
        headers: {
          'Authorization': 'Bearer ' + sessionStorage.getItem('token')
        },
        type: 'POST',
        data: { username: user.username },
        success: function (response) {
          if (response.code === 0) {
            alert('Delete successful');
            loadUsers(); // Reload list
          } else {
            alert(response.message);
          }
        },
        error: function (xhr, status, error) {
          console.error('Failed to delete user:', error);
          alert('Failed to delete user, please try again later');
        }
      });
    }
  }

  initUsers();
}); 