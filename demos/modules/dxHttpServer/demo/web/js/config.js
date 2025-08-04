$(function () {
  // System configuration page initialization
  function initConfig () {
    console.log('System configuration page initialization');

    // Get current logged in user id
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
    console.log(userInfo);
    console.log('Current logged in user info:', userInfo.id);
    $('#enterprise-id').val(userInfo.id);

    // MQTT configuration form submission handling
    $('#mqtt-form').on('submit', function (e) {
      e.preventDefault();
      const mqttConfig = {
        url: $('#mqtt-url').val(),
        username: $('#mqtt-username').val(),
        password: $('#mqtt-password').val()
      };
      console.log('MQTT configuration:', mqttConfig);
      // TODO: Send to backend to save
      alert('MQTT configuration saved');
    });
    $('#mqtt-url').on('blur', function () {
      if ($('#mqtt-url').val() === '') {
        $('.the-msg-url span').show();
      } else {
        $('.the-msg-url span').hide();
      } 
    });
    $('#mqtt-username').on('blur', function () {
      if ($('#mqtt-username').val() === '') {
        $('.the-msg-username span').show();
      } else {
        $('.the-msg-username span').hide();
      }
    });
    $('#mqtt-password').on('blur', function () {
      if ($('#mqtt-password').val() === '') {
        $('.the-msg-password span').show();
      } else {
        $('.the-msg-password span').hide();
      }
    });

    // MQTT test connection handling
    $('#test-mqtt').on('click', function () {
      // Check if MQTT configuration is correct
      if ($('#mqtt-url').val() === '') {
        $('.the-msg-url span').show();
      }
      if ($('#mqtt-username').val() === '') {
        $('.the-msg-username span').show();
      }
      if ($('#mqtt-password').val() === '') {
        $('.the-msg-password span').show();
      }
      if ($('#mqtt-url').val() === '' || $('#mqtt-username').val() === '' || $('#mqtt-password').val() === '') {
        return false;
      }
      
      const mqttConfig = {
        url: $('#mqtt-url').val(),
        username: $('#mqtt-username').val(),
        password: $('#mqtt-password').val()
      };
      console.log('Testing MQTT connection:', mqttConfig);
      // TODO: Send to backend to test connection
      alert('Testing MQTT connection...');
      $('#mqtt-status').show();
      $(this).hide();
    });

    $('#config-key').on('blur', function () {
      if ($('#config-key').val() === '') {
        $('.the-msg-config-key span').show();
      } else {
        $('.the-msg-config-key span').hide();
      }
    });

    // Configuration code form submission handling
    $('#auth-form').on('submit', function (e) {
      e.preventDefault();

      // Check if configuration code form is correct
      if ($('#enterprise-id').val() === '') {
        $('.the-msg-enterprise-id span').show();
      }
      if ($('#config-key').val() === '') {
        $('.the-msg-config-key span').show();
      }

      const authConfig = {
        enterpriseId: $('#enterprise-id').val(),
        configKey: $('#config-key').val()
      };
      console.log('Configuration code:', authConfig);
      // TODO: Send to backend to save
      alert('Configuration code saved');
    });
  }
  initConfig();
}); 