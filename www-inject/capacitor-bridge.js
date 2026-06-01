// MsouWout Capacitor Bridge
// Enhances the web app with native capabilities when running inside Capacitor
(function() {
  if (!window.Capacitor) return;

  var Capacitor = window.Capacitor;
  var isNative = Capacitor.isNativePlatform();
  if (!isNative) return;

  console.log('[MsouWout] Running in native mode');

  // Status Bar
  if (Capacitor.Plugins.StatusBar) {
    Capacitor.Plugins.StatusBar.setStyle({ style: 'LIGHT' });
    Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#00209F' });
  }

  // Splash Screen - auto hide after app loads
  if (Capacitor.Plugins.SplashScreen) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        Capacitor.Plugins.SplashScreen.hide();
      }, 500);
    });
  }

  // Geolocation - override browser geolocation with native
  if (Capacitor.Plugins.Geolocation) {
    window._nativeGeolocation = {
      getCurrentPosition: async function(success, error, options) {
        try {
          var pos = await Capacitor.Plugins.Geolocation.getCurrentPosition({
            enableHighAccuracy: options ? options.enableHighAccuracy : true
          });
          success({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            },
            timestamp: pos.timestamp
          });
        } catch (e) {
          if (error) error(e);
        }
      },
      watchPosition: function(success, error, options) {
        return Capacitor.Plugins.Geolocation.watchPosition({
          enableHighAccuracy: options ? options.enableHighAccuracy : true
        }, function(pos, err) {
          if (err) { if (error) error(err); return; }
          success({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            },
            timestamp: pos.timestamp
          });
        });
      }
    };
  }

  // Push Notifications
  if (Capacitor.Plugins.PushNotifications) {
    var PushNotifications = Capacitor.Plugins.PushNotifications;

    PushNotifications.requestPermissions().then(function(result) {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    PushNotifications.addListener('registration', function(token) {
      console.log('[MsouWout] Push token:', token.value);
      localStorage.setItem('mw_push_token', token.value);
    });

    PushNotifications.addListener('pushNotificationReceived', function(notification) {
      console.log('[MsouWout] Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', function(notification) {
      console.log('[MsouWout] Push action:', notification);
      var data = notification.notification.data;
      if (data && data.url) {
        window.location.href = data.url;
      }
    });
  }

  // Handle hardware back button on Android
  if (Capacitor.Plugins.App) {
    Capacitor.Plugins.App.addListener('backButton', function(data) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        Capacitor.Plugins.App.minimizeApp();
      }
    });
  }

  // Haptic feedback helper
  window.msouwoutHaptic = function(type) {
    if (!Capacitor.Plugins.Haptics) return;
    if (type === 'light') {
      Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
    } else if (type === 'medium') {
      Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
    } else if (type === 'heavy') {
      Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
    } else {
      Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
    }
  };

  // Add safe area CSS variables for iOS notch
  document.documentElement.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');

  console.log('[MsouWout] Native bridge initialized');
})();
