import React from 'react';
import TsrVerify from '../../components/tsrVerify';
import {exerciseService} from '../../service/exercise/exercise';
import {Record} from '../../service/exercise/model';

const TSRVerifyScreen = ({ route }: any) => {
    const { type, exercise } = route.params || {};

    const formula = 'type+startAt+endAt+ext+paths';
    const createdAt = exercise.startAt;

    return <TsrVerify formula={formula} createdAt={createdAt}
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

    ></TsrVerify>;
};

export default TSRVerifyScreen;
