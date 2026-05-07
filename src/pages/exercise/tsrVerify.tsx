import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TsrVerify from '../../components/tsrVerify';
import {exerciseService} from '../../service/exercise/exercise';
import {Record} from '../../service/exercise/model';

const TSRVerifyScreen = ({ route }: any) => {
    const insets = useSafeAreaInsets();
    const { type, exercise } = route.params || {};

    const formula = 'type+startAt+endAt+ext+paths';
    const createdAt = exercise.startAt;

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <TsrVerify formula={formula} createdAt={createdAt}
                      getFullOriginalString={
                          async ()=>{
                              const [success, result] = await exerciseService.assembleStrToCreateTSR(exercise.id);
                              if(success){
                                  return [true, result, ''];
                              }else{
                                  return [false, '', result];
                              }
                          }
                      }
                      getTSR={
                          async ()=>{
                              const [success, tsr, err] = await exerciseService.getTSR(exercise.id);
                              if(success){
                                  return [true, tsr, ''];
                              }else{
                                  return [false, '', err];
                              }
                          }
                      }

            ></TsrVerify>
        </View>
    );
};

export default TSRVerifyScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
