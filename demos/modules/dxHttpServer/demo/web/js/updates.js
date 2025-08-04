$(function() {
  let currentPage = 1;
  let totalPages = 1;
  let currentFilter = {
    sn: '',
    status: ''
  };

  // Initialize update records page
  function initUpdates() {
    console.log('Update records page initialization');
    loadUpdates();
    initEventHandlers();
  }

  // Generate mock update records data
  function generateMockUpdates() {
    const updates = [];
    const statuses = ['Update Successful', 'Update Failed', 'Updating'];
    const baseDate = new Date();
    
    for (let i = 1; i <= 50; i++) {
      const statusIndex = Math.floor(Math.random() * statuses.length);
      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + Math.floor(Math.random() * 30));
      
      updates.push({
        sn: `DEV${String(i).padStart(6, '0')}`,
        packageName: `upgrade_package_${Math.floor(Math.random() * 10) + 1}.zip`,
        oldVersion: `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        newVersion: `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        startTime: startDate.toLocaleString(),
        endTime: statuses[statusIndex] === 'Updating' ? '' : endDate.toLocaleString(),
        status: statuses[statusIndex]
      });
    }
    
    return updates;
  }

  // Load update records list
  function loadUpdates() {
    const allUpdates = generateMockUpdates();
    console.log('Loading update records data:', allUpdates);
    
    // Apply filters
    let filteredUpdates = allUpdates.filter(update => {
      if (currentFilter.sn && !update.sn.toLowerCase().includes(currentFilter.sn.toLowerCase())) {
        return false;
      }
      if (currentFilter.status) {
        const statusMap = {
          'success': 'Update Successful',
          'failed': 'Update Failed',
          'processing': 'Updating'
        };
        if (update.status !== statusMap[currentFilter.status]) {
          return false;
        }
      }
      return true;
    });

    // Calculate pagination
    const pageSize = 10;
    totalPages = Math.ceil(filteredUpdates.length / pageSize);
    currentPage = Math.min(currentPage, totalPages);
    
    // Update pagination info
    $('#page-info').text(`Page ${currentPage} of ${totalPages}`);
    $('#prev-page').prop('disabled', currentPage === 1);
    $('#next-page').prop('disabled', currentPage === totalPages);

    // Get current page data
    const startIndex = (currentPage - 1) * pageSize;
    const pageData = filteredUpdates.slice(startIndex, startIndex + pageSize);

    // Render table
    const tbody = $('#updates-table-body');
    tbody.empty();

    pageData.forEach(update => {
      const tr = $('<tr>');
      tr.append($('<td>').text(update.sn));
      tr.append($('<td>').text(update.packageName));
      tr.append($('<td>').text(update.oldVersion));
      tr.append($('<td>').text(update.newVersion));
      tr.append($('<td>').text(update.startTime));
      tr.append($('<td>').text(update.endTime));
      
      const statusTd = $('<td>');
      const statusSpan = $('<span>')
        .text(update.status)
        .addClass(getStatusClass(update.status));
      statusTd.append(statusSpan);
      tr.append(statusTd);
      
      const actionTd = $('<td>');
      const detailBtn = $('<button>')
        .addClass('detail-btn')
        .text('Details')
        .on('click', () => showUpdateDetail(update));
      actionTd.append(detailBtn);
      tr.append(actionTd);
      
      tbody.append(tr);
    });
  }

  // Get CSS class name for status
  function getStatusClass(status) {
    switch (status) {
      case 'Update Successful':
        return 'status-success';
      case 'Update Failed':
        return 'status-failed';
      case 'Updating':
        return 'status-processing';
      default:
        return '';
    }
  }

  // Initialize event handlers
  function initEventHandlers() {
    // Search box input event
    let searchTimeout;
    $('#search-sn').on('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilter.sn = $(this).val().trim();
        currentPage = 1;
        loadUpdates();
      }, 300);
    });

    // Status filter event
    $('#filter-status').on('change', function() {
      currentFilter.status = $(this).val();
      currentPage = 1;
      loadUpdates();
    });

    // Pagination button events
    $('#prev-page').on('click', function() {
      if (currentPage > 1) {
        currentPage--;
        loadUpdates();
      }
    });

    $('#next-page').on('click', function() {
      if (currentPage < totalPages) {
        currentPage++;
        loadUpdates();
      }
    });

    // Export records button event
    $('#export-records').on('click', function() {
      // TODO: Add actual export functionality here
      console.log('Exporting update records');
      alert('Export feature to be implemented');
    });
  }

  // Show update details
  function showUpdateDetail(update) {
    // TODO: Add show details functionality here
    console.log('Showing update details:', update);
    alert('Details feature to be implemented');
  }

  // Initialize after page load
  initUpdates();
}); 