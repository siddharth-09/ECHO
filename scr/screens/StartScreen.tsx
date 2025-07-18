import { useEffect, useState } from "react"
import { NativeModules, PermissionsAndroid, Platform, Pressable, Text, View } from "react-native";

export default function StartScreen() {
    const [hasPermission, setHasPermission] = useState(false);
    const [isScaning , setScaning] = useState(false);
    const SECONDS_TO_SCAN = 6;
    const SERVICE_UUIDS = [];
    const ALLOW_DUPLICATE = false;

    const BLE = NativeModules.BleManager;
    
    const StartScan = async()=>{
        console.log("started scanning")
        BLE.scan([],5,false).then(()=>{
            console.log("bluestarted")
        })
    }

    useEffect(() => {
        async function PermissionGrant() {
            if (Platform.OS === 'android' && Platform.Version >= 23) {
                PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
                    if (result) {
                        console.log('Persmission is OK')
                        setHasPermission(true);
                    }
                    else {
                        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result) => {
                            if (result) {
                                console.log("User Accepted");
                                setHasPermission(true);
                                return
                            } else {
                                console.log("User Rejected");
                            }
                        })
                    }
                })
            }
        }
        PermissionGrant();
    }, [])
    if(hasPermission === false){
        return(
            <View>
                <Text>
                    Requestion Permission
                </Text>
            </View>
        )
    }
    return (
        <View>
                <Text>
                    Permission Granted
                </Text>
                <Pressable onPress={StartScan}>
                    <Text>

                    Sidd
                    </Text>
                </Pressable>
            </View>
    )
}