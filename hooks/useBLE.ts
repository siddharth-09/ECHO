import { useState } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';

const bleManager = new BleManager();
const service_UUID = "9800";
const characteristicUUID = '9801'; // Replace with your actual characteristic UUID

interface DeviceWithTimestamp extends Device {
    lastSeen: number;
    characteristicValue?: string;
    connectionStatus?: boolean;
    isReading?: boolean;
}

export function useBLE() {
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<DeviceWithTimestamp[]>([]);
    const [autoConnect, setAutoConnect] = useState(true);

    const connectAndReadDevice = async (deviceId: string) => {
        try {
            // Update device status to show it's connecting
            setDevices(prevDevices => 
                prevDevices.map(device => 
                    device.id === deviceId 
                        ? { ...device, isReading: true }
                        : device
                ) as DeviceWithTimestamp[]
            );

            console.log(`Connecting to device: ${deviceId}`);
            const connectedDevice = await bleManager.connectToDevice(deviceId);
            console.log(`Connected to device: ${connectedDevice.name || "Unknown"}`);

            // Discover services and characteristics
            await connectedDevice.discoverAllServicesAndCharacteristics();

            // Start monitoring the characteristic for real-time updates
            connectedDevice.monitorCharacteristicForService(
                service_UUID,
                characteristicUUID,
                (error, characteristic) => {
                    if (error) {
                        console.error(`Monitor error for device ${deviceId}:`, error);
                        return;
                    }

                    if (characteristic?.value) {
                        let decodedValue = '';
                        try {
                            decodedValue = atob(characteristic.value); // Decode base64
                            console.log(`Real-time data from ${deviceId}: ${decodedValue}`);
                        } catch {
                            decodedValue = characteristic.value; // Use raw value if decode fails
                        }

                        // Update device with the new characteristic value
                        setDevices(prevDevices => 
                            prevDevices.map(device => 
                                device.id === deviceId 
                                    ? { 
                                        ...device, 
                                        characteristicValue: decodedValue || 'No data',
                                        connectionStatus: true,
                                        isReading: false
                                      }
                                    : device
                            ) as DeviceWithTimestamp[]
                        );
                    }
                }
            );

            // Update device status to show it's connected
            setDevices(prevDevices => 
                prevDevices.map(device => 
                    device.id === deviceId 
                        ? { 
                            ...device, 
                            connectionStatus: true,
                            isReading: false
                          }
                        : device
                ) as DeviceWithTimestamp[]
            );

        } catch (error) {
            console.error("Error connecting to device:", error);
            
            // Update device to show error state
            setDevices(prevDevices => 
                prevDevices.map(device => 
                    device.id === deviceId 
                        ? { 
                            ...device, 
                            characteristicValue: `Error: ${(error as Error)?.message || 'Connection failed'}`,
                            connectionStatus: false,
                            isReading: false
                          }
                        : device
                ) as DeviceWithTimestamp[]
            );
        }
    };

    const startScan = async () => {
        setIsScanning(true);
        setDevices([]);
        console.log("Starting BLE scan...");

        bleManager.startDeviceScan([service_UUID], { allowDuplicates: true }, (error, device) => {
            if (error) {
                console.error("Scan error:", error);
                setIsScanning(false);
                return;
            }

            if (device) {
                console.log(`Device: ${device.name || "Unknown"}, RSSI: ${device.rssi}`);

                setDevices(prevDevices => {
                    const deviceWithTimestamp: DeviceWithTimestamp = {
                        ...(device as Device),
                        lastSeen: Date.now(),
                        characteristicValue: undefined,
                        connectionStatus: false,
                        isReading: false
                    } as DeviceWithTimestamp;

                    const existingIndex = prevDevices.findIndex(d => d.id === device.id);

                    if (existingIndex !== -1) {
                        // Preserve existing connection state and characteristic value
                        const existingDevice = prevDevices[existingIndex];
                        deviceWithTimestamp.characteristicValue = existingDevice.characteristicValue;
                        deviceWithTimestamp.connectionStatus = existingDevice.connectionStatus;
                        deviceWithTimestamp.isReading = existingDevice.isReading;
                        
                        const updatedDevices = [...prevDevices];
                        updatedDevices[existingIndex] = deviceWithTimestamp;
                        return updatedDevices;
                    } else {
                        // Auto-connect to new devices if enabled
                        if (autoConnect) {
                            setTimeout(() => connectAndReadDevice(device.id), 1000);
                        }
                        return [...prevDevices, deviceWithTimestamp];
                    }
                });
            }
        });
    };

    const readDevice = async (deviceId: string) => {
        // This function now just triggers the connect and read process
        // The actual reading is handled by connectAndReadDevice
        await connectAndReadDevice(deviceId);
    };

    const stopScan = () => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        console.log("Stopped BLE scan");
    };

    const cleanupOldDevices = () => {
        const now = Date.now();
        setDevices(prevDevices =>
            prevDevices.filter(device => now - device.lastSeen < 10000)
        );
    };

    const disconnectDevice = async (deviceId: string) => {
        try {
            await bleManager.cancelDeviceConnection(deviceId);
            console.log(`Disconnected from device: ${deviceId}`);
            
            setDevices(prevDevices => 
                prevDevices.map(device => 
                    device.id === deviceId 
                        ? { ...device, connectionStatus: false, characteristicValue: undefined }
                        : device
                ) as DeviceWithTimestamp[]
            );
        } catch (error) {
            console.error("Error disconnecting device:", error);
        }
    };

    const toggleAutoConnect = () => {
        setAutoConnect(prev => !prev);
    };

    return {
        startScan,
        stopScan,
        isScanning,
        devices,
        cleanupOldDevices,
        readDevice,
        disconnectDevice,
        autoConnect,
        toggleAutoConnect
    };
}
