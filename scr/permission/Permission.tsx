import { PermissionsAndroid, Platform } from "react-native";


export default function Permission(){
    if(Platform.OS === 'android' && Platform.Version>=23){
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result)=>{
            if(result){
                console.log('Persmission is OK')
            }
            else{
                PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION).then((result)=>{
                    if(result){
                        console.log("User Accepted");
                    }else{
                        console.log("User Rejected");
                    }
                })
            }
        })
    }
}