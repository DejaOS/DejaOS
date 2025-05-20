$(function () {
  // Initialize upgrade package management page
  function initPackages() {
    console.log('Initializing upgrade package management page');
    loadPackages();
    initEventHandlers();
  }

  // Generate mock upgrade package data
  function generateMockPackages() {
    const packages = [];
    const statuses = ['Verified', 'Verification Failed', 'Verifying'];

    for (let i = 1; i <= 10; i++) {
      const statusIndex = Math.floor(Math.random() * statuses.length);
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      packages.push({
        filename: `upgrade_package_${i}.zip`,
        version: `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        hardwareType: `Type-${String.fromCharCode(65 + Math.floor(Math.random() * 3))}`,
        uploadTime: date.toLocaleString(),
        status: statuses[statusIndex]
      });
    }

    return packages;
  }

  // Load upgrade package list
  function loadPackages() {
    const packages = generateMockPackages();
    console.log('Loading upgrade package data:', packages);
    const tbody = $('#packages-table-body');
    tbody.empty();

    packages.forEach(pkg => {
      const tr = $('<tr>');
      tr.append($('<td>').text(pkg.filename));
      tr.append($('<td>').text(pkg.version));
      tr.append($('<td>').text(pkg.hardwareType));
      tr.append($('<td>').text(pkg.uploadTime));

      const statusTd = $('<td>');
      const statusSpan = $('<span>')
        .text(pkg.status)
        .addClass(getStatusClass(pkg.status));
      statusTd.append(statusSpan);
      tr.append(statusTd);

      const actionTd = $('<td>');
      if (pkg.status === 'Verified') {
        const deleteBtn = $('<button>')
          .addClass('action-btn delete-btn')
          .text('Delete')
          .on('click', () => deletePackage(pkg));
        actionTd.append(deleteBtn);
      }
      tr.append(actionTd);

      tbody.append(tr);
    });
  }

  // Get CSS class for status
  function getStatusClass(status) {
    switch (status) {
      case 'Verified':
        return 'status-success';
      case 'Verification Failed':
        return 'status-error';
      case 'Verifying':
        return 'status-processing';
      default:
        return '';
    }
  }

  // Initialize event handlers
  function initEventHandlers() {
    // Upload package button click event
    $('#upload-package').on('click', function () {
      $('#upload-dialog').show();
    });

    // Cancel upload button click event
    $('#cancel-upload').on('click', function () {
      $('#upload-dialog').hide();
      $('#upload-form')[0].reset();
    });

    // Upload form submit event
    $('#upload-form').on('submit', function (e) {
      e.preventDefault();

      const file = $('#package-file')[0].files[0];
      const version = $('#package-version').val().trim();
      const hardwareType = $('#hardware-type').val();

      if (!file) {
        alert('Please select an upgrade package file');
        return;
      }

      if (!version) {
        alert('Please enter version number');
        return;
      }

      if (!hardwareType) {
        alert('Please select hardware type');
        return;
      }

      // Show upload progress
      const progressBar = $('<div>')
        .addClass('progress-bar')
        .css('width', '0%')
        .text('0%');
      $('#upload-progress').html(progressBar);

      // Send Ajax request
      $.ajax({
        url: '/api/packages/upload',
        type: 'POST',
        headers: {
          'Authorization': 'Bearer ' + sessionStorage.getItem('token')
        },
        data: file,
        processData: false,
        contentType: 'application/octet-stream',
        success: function (res) {
          console.log(res);
          alert('Upload successful');
        },
        error: function (xhr, status, error) {
          alert('Upload failed: ' + error);
        }
      });
    });
  }

  // Delete upgrade package
  function deletePackage(pkg) {
    if (confirm(`Are you sure you want to delete the upgrade package "${pkg.filename}"?`)) {
      // TODO: Add actual delete request here
      console.log('Deleting upgrade package:', pkg);
      alert('Delete successful');
      loadPackages(); // Reload the list
    }
  }

  initPackages();
}); 