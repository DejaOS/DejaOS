$(function () {
  // Device management page initialization
  function initDevices () {
    console.log('Device management page initialization');
    loadDevices();
    initEventHandlers();
  }

  // Generate mock device data
  function generateMockDevices () {
    const statuses = ['Online', 'Offline', 'Upgrading'];
    const hardwareTypes = ['Type-A', 'Type-B', 'Type-C'];
    const appNames = ['App-1', 'App-2', 'App-3'];
    const devices = [];

    // Generate 30 device records
    for (let i = 1; i <= 30; i++) {
      const statusIndex = Math.floor(Math.random() * statuses.length);
      const hardwareIndex = Math.floor(Math.random() * hardwareTypes.length);
      const appIndex = Math.floor(Math.random() * appNames.length);
      const version = `${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`;

      devices.push({
        sn: `DEV${String(i).padStart(6, '0')}`,
        status: statuses[statusIndex],
        hardwareType: hardwareTypes[hardwareIndex],
        appName: appNames[appIndex],
        appVersion: version
      });
    }

    return devices;
  }

  // Load device list
  function loadDevices () {
    const devices = generateMockDevices();
    console.log('Loading device data:', devices);
    const tbody = $('#devices-table-body');
    tbody.empty();

    devices.forEach(device => {
      const tr = $('<tr>');
      tr.append($('<td>').append($('<input type="checkbox">').addClass('device-checkbox')));
      tr.append($('<td>').text(device.sn));
      tr.append($('<td>').text(device.status));
      tr.append($('<td>').text(device.hardwareType));
      tr.append($('<td>').text(device.appName));
      tr.append($('<td>').text(device.appVersion));

      const actionTd = $('<td>');
      const upgradeBtn = $('<button>')
        .addClass('action-btn upgrade-btn')
        .text('Upgrade')
        .on('click', () => upgradeDevice(device));
      const deleteBtn = $('<button>')
        .addClass('action-btn delete-btn')
        .text('Delete')
        .on('click', () => deleteDevice(device));

      actionTd.append(upgradeBtn, deleteBtn);
      tr.append(actionTd);
      tbody.append(tr);
    });
  }

  // Initialize event handlers
  function initEventHandlers () {
    // Select/Deselect all
    $('#select-all').on('change', function () {
      $('.device-checkbox').prop('checked', $(this).prop('checked'));
    });

    // Batch upgrade
    $('#batch-upgrade').on('click', function () {
      const selectedDevices = getSelectedDevices();
      if (selectedDevices.length === 0) {
        alert('Please select devices to upgrade');
        return;
      }
      console.log('Batch upgrading devices:', selectedDevices);
      alert('Batch upgrade feature to be implemented');
    });

    // Batch delete
    $('#batch-delete').on('click', function () {
      const selectedDevices = getSelectedDevices();
      if (selectedDevices.length === 0) {
        alert('Please select devices to delete');
        return;
      }
      if (confirm(`Are you sure you want to delete ${selectedDevices.length} selected devices?`)) {
        console.log('Batch deleting devices:', selectedDevices);
        alert('Batch delete feature to be implemented');
      }
    });
  }

  // Get selected devices
  function getSelectedDevices () {
    const devices = [];
    $('.device-checkbox:checked').each(function () {
      const tr = $(this).closest('tr');
      devices.push({
        sn: tr.find('td:eq(1)').text(),
        appName: tr.find('td:eq(4)').text(),
        appVersion: tr.find('td:eq(5)').text()
      });
    });
    return devices;
  }

  // Upgrade single device
  function upgradeDevice (device) {
    console.log('Upgrading device:', device);
    alert('Upgrade feature to be implemented');
  }

  // Delete single device
  function deleteDevice (device) {
    console.log('Deleting device:', device);
    if (confirm(`Are you sure you want to delete device "${device.sn}"?`)) {
      alert('Delete feature to be implemented');
    }
  }

  initDevices();
}); 