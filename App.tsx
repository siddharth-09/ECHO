import React, { useEffect, useState, useRef } from "react";
import { 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  FlatList, 
  PermissionsAndroid, 
  Platform, 
  TextInput
} from "react-native";
import { BleManager, Device as BLEDevice, Characteristic } from "react-native-ble-plx";
import BLEAdvertiser from 'react-native-ble-advertiser';

const bleManager = new BleManager();
const SERVICE_UUID = "9800";
const CHARACTERISTIC_UUID = "9801"; // Add characteristic UUID for data transfer
const APP_ID = "8fb049f3-72dc-4af9-91ab-939a3af21cf5";

type Device = {
  id: string;
  name?: string;
  rssi?: number;
  bleDevice?: BLEDevice; // Store the actual BLE device for communication
};

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Device[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<Device[]>([]);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [_data, setData] = useState<string>('hello');

  const name1 = "Yash Phone";
  const name2 = "Jay Phone";

  const encoded = new TextEncoder().encode(name1);
  const encoded2 = new TextEncoder().encode(name2);

  useEffect(() => {
    initializeApp();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      await requestPermissions();
      await initializeBLE();
      await startBroadcasting(); // Auto-start broadcasting
    } catch (error) {
      console.error('App initialization error:', error);
      Alert.alert('Error', 'Failed to initialize app');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      try {
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = permissions.every(
          permission => granted[permission] === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          Alert.alert('Permissions Required', 'All permissions are needed for the app to work properly');
        }
      } catch (error) {
        console.error('Permission request error:', error);
      }
    }
  };

  const initializeBLE = async () => {
    try {
      const state = await bleManager.state();
      console.log('BLE State:', state);
      
      if (state !== 'PoweredOn') {
        Alert.alert('Bluetooth', 'Please turn on Bluetooth');
        return;
      }
      
      console.log('BLE Manager initialized');
    } catch (error) {
      console.error('BLE initialization error:', error);
      throw error;
    }
  };

  const startBroadcasting = async () => {
    try {
      // Set company ID
      BLEAdvertiser.setCompanyId(1234);
      
      // // Convert data to bytes for broadcasting
      // const dataToSend = _data ? _data.slice(0, 15) : 'hello';
      // const dataBytes = new TextEncoder().encode(dataToSend);
      
      // Start broadcasting with data
      await BLEAdvertiser.broadcast(
        APP_ID,
        [0x01, 0x02],
        {

        } // Example manufacturer data
      );
      
      setIsBroadcasting(true);
    } catch (error) {
      console.error('Error starting broadcast:', error);
      Alert.alert('Broadcast Error', `Failed to start broadcasting: ${error.message}`);
    }
  };

  const stopBroadcasting = async () => {
    try {
      await BLEAdvertiser.stopBroadcast();
      setIsBroadcasting(false);
      console.log('Broadcasting stopped');
    } catch (error) {
      console.error('Error stopping broadcast:', error);
    }
  };

  const startScanning = async () => {
    if (isScanning) return;
    
    try {
      setIsScanning(true);
      setDiscoveredDevices([]);
      
      console.log('Starting scan...');
      
      // Start scanning for devices
      bleManager.startDeviceScan([APP_ID], null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          setIsScanning(false);
          return;
        }
        
        if (device) {
          console.log('Found device:', device.name, device.id);
          console.log('Manufacturer data:', device.manufacturerData);
          
          setDiscoveredDevices(prev => {
            const exists = prev.find(d => d.id === device.id);
            if (!exists) {
              return [
                ...prev,
                {
                  id: device.id,
                  name: device.localName ?? device.name ?? undefined,
                  rssi: device.rssi ?? undefined,
                  bleDevice: device,
                }
              ];
            }
            return prev;
          });
        }
      });
      
      // Stop scanning after 10 seconds
      scanTimeoutRef.current = setTimeout(() => {
        stopScanning();
      }, 10000);
      
    } catch (error) {
      console.error('Scan start error:', error);
      setIsScanning(false);
      Alert.alert('Scan Error', 'Failed to start scanning');
    }
  };

  const stopScanning = () => {
    try {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      
      console.log('Scanning stopped');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  };

  const connectToDevice = async (device: Device) => {
    try {
      console.log('Connecting to:', device.name);
      
      const connectedDevice = await bleManager.connectToDevice(device.id);
      console.log('Connected device:', connectedDevice);
      
      // Discover services and characteristics
      const deviceWithServices = await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('Services discovered');
      
      // Update the device with the connected BLE device
      const updatedDevice = { ...device, bleDevice: deviceWithServices };
      setConnectedDevices(prev => [...prev, updatedDevice]);
      
      Alert.alert('Success', `Connected to ${device.name || 'Unknown Device'}`);
      console.log('Connected to:', device.name);
      
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Error', `Failed to connect to ${device.name || 'Unknown Device'}`);
    }
  };

  const disconnectFromDevice = async (device: Device) => {
    try {
      await bleManager.cancelDeviceConnection(device.id);
      setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
      
      Alert.alert('Disconnected', `Disconnected from ${device.name || 'Unknown Device'}`);
      console.log('Disconnected from:', device.name);
      
    } catch (error) {
      console.error('Disconnect error:', error);
      Alert.alert('Disconnect Error', `Failed to disconnect from ${device.name || 'Unknown Device'}`);
    }
  };

  const sendDataToDevice = async (device: Device) => {
    if (!device.bleDevice || !_data) {
      Alert.alert('Error', 'No data to send or device not properly connected');
      return;
    }

    try {
      console.log('Sending data to device:', device.name, 'Data:', _data);
      
      // Get services from the connected device
      const services = await device.bleDevice.services();
      console.log('Available services:', services.map(s => s.uuid));
      
      // Try to find a writable characteristic
      let foundCharacteristic: Characteristic | null = null;
      
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          // Look for a characteristic that supports writing
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            foundCharacteristic = char;
            console.log('Found writable characteristic:', char.uuid);
            break;
          }
        }
        if (foundCharacteristic) break;
      }
      
      if (!foundCharacteristic) {
        Alert.alert('Error', 'No writable characteristic found on this device');
        return;
      }
      
      // Convert data to base64 for transmission
      const dataToSend = new TextEncoder().encode(_data);
      const base64Data = btoa(String.fromCharCode(...dataToSend));
      
      // Write the data to the characteristic
      await foundCharacteristic.writeWithResponse(base64Data);
      
      Alert.alert('Success', `Data "${_data}" sent to ${device.name || 'Unknown Device'}`);
      console.log('Data sent successfully');
      
    } catch (error) {
      console.error('Error sending data:', error);
      Alert.alert('Send Error', `Failed to send data: ${error.message}`);
    }
  };

  const updateBroadcastData = async () => {
    try {
      console.log('Updating broadcast data:', _data);
      
      if (isBroadcasting) {
        await stopBroadcasting();
        setTimeout(() => {
          startBroadcasting();
        }, 500);
      } else {
        await startBroadcasting();
      }
      
      Alert.alert('Success', 'Broadcast data updated successfully');
    } catch (error) {
      console.error('Error updating broadcast data:', error);
      Alert.alert('Error', 'Failed to update broadcast data');
    }
  };

  const cleanup = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    try {
      bleManager.stopDeviceScan();
      BLEAdvertiser.stopBroadcast();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const renderDiscoveredDevice = ({ item }: { item: Device }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
        {item.rssi && <Text style={styles.rssi}>RSSI: {item.rssi}</Text>}
      </View>
      <Pressable
        style={styles.connectButton}
        onPress={() => connectToDevice(item)}
      >
        <Text style={styles.buttonText}>Connect</Text>
      </Pressable>
    </View>
  );

  const renderConnectedDevice = ({ item }: { item: Device }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Connected Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      <View style={styles.deviceActions}>
        <Pressable
          style={styles.sendButton}
          onPress={() => sendDataToDevice(item)}
        >
          <Text style={styles.buttonText}>Send Data</Text>
        </Pressable>
        <Pressable
          style={styles.disconnectButton}
          onPress={() => disconnectFromDevice(item)}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Central & Peripheral</Text>
      
      {/* Status Section */}
      <View style={styles.statusSection}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Broadcasting:</Text>
          <Text style={[styles.statusValue, { color: isBroadcasting ? '#4CAF50' : '#F44336' }]}>
            {isBroadcasting ? 'ON' : 'OFF'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Scanning:</Text>
          <Text style={[styles.statusValue, { color: isScanning ? '#4CAF50' : '#F44336' }]}>
            {isScanning ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      {/* Data Input Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data to Send/Broadcast</Text>
        <TextInput 
          value={_data}
          onChangeText={setData}
          placeholder="Enter data to send"
          style={styles.textInput}
          maxLength={50}
        />
        <Text style={styles.dataInfo}>Current data: "{_data}" ({_data.length}/50 chars)</Text>
        <Pressable
          style={[styles.controlButton, { backgroundColor: '#FF9800' }]}
          onPress={updateBroadcastData}
        >
          <Text style={styles.buttonText}>Update Broadcast Data</Text>
        </Pressable>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonSection}>
        <Pressable
          style={[styles.controlButton, { backgroundColor: isBroadcasting ? '#F44336' : '#4CAF50' }]}
          onPress={isBroadcasting ? stopBroadcasting : startBroadcasting}
        >
          <Text style={styles.buttonText}>
            {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.controlButton, { backgroundColor: isScanning ? '#F44336' : '#007AFF' }]}
          onPress={isScanning ? stopScanning : startScanning}
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Stop Scanning' : 'Start Scanning'}
          </Text>
        </Pressable>
      </View>

      {/* Connected Devices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Devices ({connectedDevices.length})</Text>
        <FlatList
          data={connectedDevices}
          renderItem={renderConnectedDevice}
          keyExtractor={(item) => item.id}
          style={styles.deviceList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No connected devices</Text>
          }
        />
      </View>

      {/* Discovered Devices */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovered Devices ({discoveredDevices.length})</Text>
        <FlatList
          data={discoveredDevices}
          renderItem={renderDiscoveredDevice}
          keyExtractor={(item) => item.id}
          style={styles.deviceList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No devices found</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  controlButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    fontSize: 16,
    marginBottom: 8,
  },
  dataInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  deviceList: {
    maxHeight: 150,
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  rssi: {
    fontSize: 10,
    color: '#999',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 5,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 5,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
});