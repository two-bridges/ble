# NativeScript <img src="https://github.com/nativescript-community/ble/raw/master/media/bluetooth.gif" height="20px" alt="Bluetooth"/> plugin

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Twitter Follow][twitter-image]][twitter-url]

[npm-image]:http://img.shields.io/npm/v/@nativescript-community/ble.svg
[npm-url]:https://npmjs.org/package/@nativescript-community/ble
[downloads-image]:http://img.shields.io/npm/dm/@nativescript-community/ble.svg
[twitter-image]:https://img.shields.io/twitter/follow/eddyverbruggen.svg?style=social&label=Follow%20me
[twitter-url]:https://twitter.com/eddyverbruggen

## Installation
From the command prompt go to your app's root folder and execute:

if using @nativescript
```
tns plugin add @nativescript-community/ble
```



And do yourself a favor by adding TypeScript support to your nativeScript app:

```
tns install typescript
```

## API
Want to dive in quickly? Check out [the demo app](https://github.com/nativescript-community/ble/tree/master/demo)! Otherwise, mix and match these functions as you see fit:

#### Prerequisites
- [isBluetoothEnabled](#isbluetoothenabled)
- [requestLocationPermission](#requestLocationPermission)
- [hasLocationPermission](#haslocationpermission)
- [enable (Android only)](#enable-android-only)

#### Discovery
- [startScanning](#startscanning)
- [stopScanning](#stopscanning)

#### Connectivity
- [connect](#connect)
- [disconnect](#disconnect)

#### Interaction
- [read](#read)
- [write](#write)
- [startNotifying](#startnotifying)
- [stopNotifying](#stopnotifying)

#### Debugging
- [setCharacteristicLogging](#setcharacteristiclogging)


### isBluetoothEnabled
Reports if bluetooth is enabled.

```typescript
// require the plugin
import { Bluetooth } from '@nativescript-community/ble';
var bluetooth = new Bluetooth();

bluetooth.isBluetoothEnabled().then(
  function(enabled) {
    console.log("Enabled? " + enabled);
  }
);
```
### hasLocationPermission
__Since plugin version 1.2.0 the `startScanning` function will handle this internally so it's no longer mandatory to add permission checks to your code.__

On Android 6 you need to request permission to be able to interact with a Bluetooth peripheral (when the app is in the background) when targeting API level 23+. Even if the `uses-permission` tag for `ACCESS_COARSE_LOCATION` is present in `AndroidManifest.xml`.

Note that for `BLUETOOTH` and `BLUETOOTH_ADMIN` you don't require runtime permission; adding those to `AndroidManifest.xml` suffices (which the plugin does for you).

Note that `hasLocationPermission ` will return true when:
* You're running this on iOS, or
* You're targeting an API level lower than 23, or
* You're using a device running Android < 6, or
* You've already granted permission.

```typescript
bluetooth.hasLocationPermission().then(
  function(granted) {
    // if this is 'false' you probably want to call 'requestLocationPermission' now
    console.log("Has Location Permission? " + granted);
  }
);
```

### requestLocationPermission
__Since plugin version 1.2.0 the `startScanning` function will handle this internally so it's no longer mandatory to add permission checks to your code.__

```typescript
// if no permission was granted previously this will open a user consent screen
bluetooth.requestLocationPermission().then(
  function(granted) {
    console.log("Location permission requested, user granted? " + granted);
  }
);
```

### enable (Android only)
The promise will be rejected on iOS

```typescript
// This turns bluetooth on, will return false if the user denied the request.
bluetooth.enable().then(
  function(enabled) {
    // use Bluetooth features if enabled is true 
  }
);
```

### startScanning
A few of the optional params require a bit of explanation:

#### seconds
Scanning for peripherals drains the battery quickly, so you better not scan any longer than necessary. If a peripheral is in range and not engaged in another connection it usually pops up in under a second. If you don't pass in a number of seconds you will need to manually call `stopScanning`.

#### avoidDuplicates
Set this to true if you don't want duplicates with the same serviceUUID reported in "onDiscovered" callback.
If true, only the first discovered peripheral with the same serviceUUID will be reported.

#### skipPermissionCheck
Set this to true if you don't want the plugin to check (and request) the required Bluetooth permissions.
Particularly useful if you're running this function on a non-UI thread (ie. a Worker).
Relevant on Android only.

#### filters
It's inefficient to scan for all available Bluetooth peripherals and have them report all services they offer.
Moreover on Android if we don't use filters we must have location permissions and have GPS enabled

If you're only interested in finding a heartrate peripheral for instance, pass in service UUID `'180d'` like this: filters: [{serviceUUID:'180d'}]. If you add 2 or more (comma separated) services then only peripherals supporting ALL those services will match.

Note that UUID's are ALWAYS strings; don't pass integers.

#### onDiscovered
While scanning the plugin will immediately report back uniquely discovered peripherals.

This function will receive an object representing the peripheral which contains these properties (and types):
* `UUID: string`
* `name: string`
* `RSSI: number` (relative signal strength, can be used for distance measurement)
* `services?:` (optional - this is set once connected to the peripheral)
* `manufacturerId?: number` (optional)
* `advertismentData?:  {
    localName?:string
    manufacturerData?: ArrayBuffer;
    serviceUUIDs?: string[];
    txPowerLevel?:number,
    flags?:number
  }` (optional)

```typescript
bluetooth.startScanning({
  filters: [{serviceUUID:'180d'}],
  seconds: 4,
  onDiscovered: function (peripheral) {
  	console.log("Periperhal found with UUID: " + peripheral.UUID);
  }
}).then(function() {
  console.log("scanning complete");
}, function (err) {
  console.log("error while scanning: " + err);
});
```

### stopScanning
At any time during a scan, being one where you passed in a number or seconds or not, you can stop the scan by calling this function.

You may for instance want to stop scanning when the peripheral you found in `startScanning`'s `onDiscovered` callback matches your criteria.

```typescript
bluetooth.stopScanning().then(function() {
  console.log("scanning stopped");
});
```

### connect
Pass in the UUID of the peripheral you want to connect to and once a connection has been established the `onConnected` callback function will be invoked. This callback will received the peripheral object as before, but it's now enriched with a `services` property. An example of the returned peripheral object could be:

```typescript
  peripheral: {
    UUID: '3424-542-4534-53454',
    name: 'Polar P7 Heartrate Monitor',
    RSSI: '-57',
    services: [{    
      UUID: '180d',
      name: 'Heartrate service',
      characteristics: [{
        UUID: '34534-54353-234324-343',
        name: 'Heartrate characteristic',
        properties: {
          read: true,
          write: false,
          writeWithoutResponse: false,
          notify: true
        }
      }]
    }]
  }
```

Here's the `connect` function in action with an implementation of `onConnected` that simply dumps the entire peripheral object to the console:

```typescript
bluetooth.connect({
  UUID: '04343-23445-45243-423434',
  onConnected: function (peripheral) {
  	console.log("Periperhal connected with UUID: " + peripheral.UUID);

  	// the peripheral object now has a list of available services:
  	peripheral.services.forEach(function(service) {
  	  console.log("service found: " + JSON.stringify(service));
   });
  },
  onDisconnected: function (peripheral) {
  	console.log("Periperhal disconnected with UUID: " + peripheral.UUID);
  }
});
```

Also note that `onDisconnected` function: if you try to interact with the peripheral after this event you risk crashing your app.


### disconnect
Once done interacting with the peripheral be a good citizen and disconnect. This will allow other applications establishing a connection.

```typescript
bluetooth.disconnect({
  UUID: '34234-5453-4453-54545'
}).then(function() {
  console.log("disconnected successfully");
}, function (err) {
  // in this case you're probably best off treating this as a disconnected peripheral though
  console.log("disconnection error: " + err);
});
```

### read
If a peripheral has a service that has a characteristic where `properties.read` is `true` then you can call the `read` function to retrieve the current state (value) of the characteristic.

The promise will receive an object like this:

```typescript
{
  value: <ArrayBuffer>, // an ArrayBuffer which you can use to decode (see example below)
  ios: <72>, // the platform-specific binary value of the characteristic: NSData (iOS), byte[] (Android)
  android: <72>, // the platform-specific binary value of the characteristic: NSData (iOS), byte[] (Android)
  characteristicUUID: '434234-234234-234234-434'
}
```

Armed with this knowledge, let's invoke the `read` function:

```typescript
bluetooth.read({
  peripheralUUID: '34234-5453-4453-54545',
  serviceUUID: '180d',
  characteristicUUID: '3434-45234-34324-2343'
}).then(function(result) {
  // fi. a heartrate monitor value (Uint8) can be retrieved like this:
  var data = new Uint8Array(result.value);
  console.log("Your heartrate is: " + data[1] + " bpm");  
}, function (err) {
  console.log("read error: " + err);
});
```

### write
If a peripheral has a service that has a characteristic where `properties.write` is `true` then you can call the `write` function to update the current state (value) of the characteristic.

The value may be a string or any array type value. If you pass a string you should pass the encoding too

```typescript
bluetooth.write({
  peripheralUUID: '34134-5453-4453-54545',
  serviceUUID: '180e',
  characteristicUUID: '3424-45234-34324-2343',
  value: [1]
}).then(function(result) {
  console.log("value written");
}, function (err) {
  console.log("write error: " + err);
});
```

### writeWithoutResponse
Same API as `write`, except that when the promise is invoked the value has not been written yet; it has only been requested to be written an no response will be received when it has.

### startNotifying
If a peripheral has a service that has a characteristic where `properties.notify` is `true` then you can call the `startNotifying` function to retrieve the value changes of the characteristic.

Usage is very much like `read`, but the result won't be sent to the promise, but to the `onNotify` callback function you pass in. This is because multiple notifications can be received and a promise can only resolve once. The value of the object sent to `onNotify` is the same as the one you get in the promise of `read`.

```typescript
bluetooth.startNotifying({
  peripheralUUID: '34234-5453-4453-54545',
  serviceUUID: '180d',
  characteristicUUID: '3434-45234-34324-2343',
  onNotify: function (result) {
    // see the read example for how to decode ArrayBuffers
	console.log("read: " + JSON.stringify(result));
  }  
}).then(function() {
  console.log("subscribed for notifications");
});
```

### stopNotifying
Enough is enough. When you're no longer interested in the values the peripheral is sending you do this:

```typescript
bluetooth.stopNotifying({
  peripheralUUID: '34234-5453-4453-54545',
  serviceUUID: '180d',
  characteristicUUID: '3434-45234-34324-2343'
}).then(function() {
  console.log("unsubscribed for notifications");
}, function (err) {
  console.log("unsubscribe error: " + err);
});
```

### setCharacteristicLogging
The app using bluetooth can generate many console.log messages - one for each characteristic read, write, change.
This can be reduced by calling `bluetooth.setCharacteristicLogging(false)`.

## Troubleshooting
Get a merge issue in AndroidManifest.xml? Remove the platforms/android folder and rebuild.

## Future work
* Support interacting with multiple characteristics of the same peripheral at the same time.
