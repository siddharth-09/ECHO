import { useBLE } from "@/hooks/useBLE";
import { useEffect, useRef } from "react";
import { Button, FlatList, PermissionsAndroid, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {
  const { 
    startScan, 
    stopScan, 
    isScanning, 
    devices, 
    cleanupOldDevices, 
    readDevice, 
    disconnectDevice, 
    autoConnect, 
    toggleAutoConnect 
  } = useBLE();
  const cleanupInterval = useRef<number | null>(null);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        console.log("Permissions granted:", granted);
      } catch (err) {
        console.warn(err);
      }
    }
    requestPermissions();
  }, []);

  // Cleanup old devices periodically
  useEffect(() => {
    if (isScanning) {
      cleanupInterval.current = setInterval(() => {
        cleanupOldDevices();
      }, 5000); // Clean up every 5 seconds
    } else {
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
        cleanupInterval.current = null;
      }
    }

    return () => {
      if (cleanupInterval.current) {
        clearInterval(cleanupInterval.current);
      }
    };
  }, [isScanning, cleanupOldDevices]);

  const getRSSIColor = (rssi: number | null) => {
    if (!rssi) return '#999';
    if (rssi > -50) return '#4CAF50'; // Excellent
    if (rssi > -60) return '#8BC34A'; // Good  
    if (rssi > -70) return '#FFC107'; // Fair
    return '#F44336'; // Poor
  };

  const getRSSIStrength = (rssi: number | null) => {
    if (!rssi) return 'Unknown';
    if (rssi > -50) return 'Excellent';
    if (rssi > -60) return 'Good';
    if (rssi > -70) return 'Fair';
    return 'Poor';
  };

  const handleReadDevice = (deviceId: string) => {
    readDevice(deviceId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Real-time Scanner</Text>
      
      <View style={styles.controlsContainer}>
        <Button 
          title={isScanning ? "Stop Scanning" : "Start Scanning"} 
          onPress={isScanning ? stopScan : startScan} 
        />
        
        <TouchableOpacity 
          style={[styles.autoConnectButton, autoConnect && styles.autoConnectButtonActive]}
          onPress={toggleAutoConnect}
        >
          <Text style={[styles.autoConnectText, autoConnect && styles.autoConnectTextActive]}>
            Auto-Connect: {autoConnect ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.deviceCount}>
        Found Devices: {devices.length} | Auto-Connect: {autoConnect ? 'Enabled' : 'Disabled'}
      </Text>
      
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const timeSinceLastSeen = Math.floor((Date.now() - item.lastSeen) / 1000);
          return (
            <View style={styles.deviceItem}>
              <Text style={styles.deviceName}>
                {item.name || 'Unknown Device'}
              </Text>
              <Text style={styles.deviceId}>ID: {item.localName || item.id}</Text>
              
              <View style={styles.rssiContainer}>
                <Text style={[styles.rssiValue, { color: getRSSIColor(item.rssi) }]}>
                  RSSI: {item.rssi} dBm
                </Text>
                <Text style={[styles.rssiStrength, { color: getRSSIColor(item.rssi) }]}>
                  ({getRSSIStrength(item.rssi)})
                </Text>
              </View>

              {/* Connection Status */}
              {item.connectionStatus && (
                <Text style={styles.connectionStatus}>🔗 Connected - Real-time</Text>
              )}

              {/* Characteristic Value */}
              {item.characteristicValue && (
                <View style={styles.characteristicContainer}>
                  <Text style={styles.characteristicLabel}>Live Data:</Text>
                  <Text style={styles.characteristicValue}>
                    {item.characteristicValue}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[
                    styles.readButton, 
                    item.isReading && styles.readButtonDisabled
                  ]}
                  onPress={() => handleReadDevice(item.id)}
                  disabled={item.isReading}
                >
                  <Text style={styles.readButtonText}>
                    {item.isReading ? 'Connecting...' : item.connectionStatus ? 'Reconnect' : 'Connect'}
                  </Text>
                </TouchableOpacity>

                {item.connectionStatus && (
                  <TouchableOpacity 
                    style={styles.disconnectButton}
                    onPress={() => disconnectDevice(item.id)}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.lastSeen}>
                Last seen: {timeSinceLastSeen}s ago
              </Text>
            </View>
          );
        }}
        extraData={devices} // This ensures FlatList re-renders when RSSI updates
      />
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
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  autoConnectButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  autoConnectButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  autoConnectText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  autoConnectTextActive: {
    color: 'white',
  },
  deviceCount: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  deviceItem: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  rssiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  rssiValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  rssiStrength: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  characteristicContainer: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  characteristicLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 2,
  },
  characteristicValue: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'monospace',
    backgroundColor: '#f9f9f9',
    padding: 4,
    borderRadius: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 5,
  },
  readButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
  },
  readButtonDisabled: {
    backgroundColor: '#ccc',
  },
  readButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disconnectButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    flex: 1,
  },
  disconnectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lastSeen: {
    fontSize: 12,
    color: '#999',
  },
});