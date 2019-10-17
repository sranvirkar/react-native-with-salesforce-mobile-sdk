/*
 * Copyright (c) 2015-present, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import EventEmitter from './events';
import {smartstore, smartsync, forceUtil} from 'react-native-force';
import { net } from 'react-native-force';

const registerSoup = forceUtil.promiser(smartstore.registerSoup);
const getSyncStatus = forceUtil.promiser(smartsync.getSyncStatus);
const syncDown = forceUtil.promiserNoRejection(smartsync.syncDown);
const syncUp = forceUtil.promiserNoRejection(smartsync.syncUp);
const reSync = forceUtil.promiserNoRejection(smartsync.reSync);

const syncName = "smartSyncExplorerSyncDown";
let syncInFlight = false;
let lastStoreQuerySent = 0;
let lastStoreResponseReceived = 0;
const eventEmitter = new EventEmitter();

const displayFieldList = ["Id", "FirstName", "LastName", "Title", "Email", "MobilePhone", "Company"];

const SMARTSTORE_CHANGED = "smartstoreChanged";

function emitSmartStoreChanged() {
    eventEmitter.emit(SMARTSTORE_CHANGED, {});
}

function syncDownLeads(fields) {
    if (syncInFlight) {
        console.log("Not starting syncDown - sync already in fligtht");
        return Promise.resolve();
    }
    
    console.log("Starting syncDown");
    syncInFlight = true;
    const fieldlist = [];//["Id", "FirstName", "LastName", "Title", "Email", "MobilePhone", "LastModifiedDate"];

    for(let i=0; i<fields.length; i++){
        fieldlist.push(fields[i][0]);
    }

    const target = {type:"soql", query:`SELECT ${fieldlist.join(",")} FROM Lead LIMIT 10000`};
    return syncDown(false, target, "leads", {mergeMode:smartsync.MERGE_MODE.OVERWRITE}, syncName)
        .then(() => {
            console.log("syncDown completed or failed");
            syncInFlight = false;
            emitSmartStoreChanged();
        });
}

function reSyncLeads() {
    if (syncInFlight) {
        console.log("Not starting reSync - sync already in fligtht");
        return Promise.resolve();
    }

    console.log("Starting reSync");
    syncInFlight = true;
    return reSync(false, syncName)
        .then(() => {
            console.log("reSync completed or failed");
            syncInFlight = false;
            emitSmartStoreChanged();
        });
}

function syncUpLeads(fields) {
    if (syncInFlight) {
        console.log("Not starting syncUp - sync already in fligtht");
        return Promise.resolve();
    }

    console.log("Starting syncUp");
    syncInFlight = true;
    const fieldlist = []; //["FirstName", "LastName", "Title", "Email", "MobilePhone"];

    for(let i=0; i<fields.length; i++){
        if(fields[i][0] !== "Id"){
            fieldlist.push(fields[i][0]);
        }       
    }

    return syncUp(false, {}, "leads", {mergeMode:smartsync.MERGE_MODE.OVERWRITE, fieldlist})
        .then(() => {
            console.log("syncUp completed or failed");
            syncInFlight = false;
            emitSmartStoreChanged();
        });
}

function getObjectFields(objectName){

    return new Promise((resolve, reject) => {
        net.sendRequest('/services/apexrest/','FieldPermissions',
            (resp) => {
                console.log('--> SUCCESS from API AppDefaults');
                

                registerSoup(false,
                    "fields", 
                    [ {path:"field", type:"string"}, 
                      {path:"objectName", type:"string"},
                      {path:"type", type:"string"}  ])
                .then(registerSoupResp => {

                    let filteredFields = filterFields(resp, objectName);
                    let smrtStoreFileds = [
                        {field: "Id", objectName: objectName, type: "string"},
                        {field: "FirstName", objectName: objectName, type: "full_text"},
                        {field: "LastName", objectName: objectName, type: "full_text"}
                    ];
                    for(let i=0; i<filteredFields.length; i++){
                        if((filteredFields[i] !== "Id") && (filteredFields[i] !== "FirstName") && (filteredFields[i] !== "LastName")){
                            if(displayFieldList.indexOf(filteredFields[i]) > -1){
                                smrtStoreFileds.push({field: filteredFields[i], objectName: objectName, type: "full_text"});  
                            }                            
                        }
                    }

                    smartstore.upsertSoupEntries(false, "fields", smrtStoreFileds, (sucsessResp) => {
                        resolve(sucsessResp);
                    }, (errResp) => {
                        reject(errResp);
                    });
                })
                .catch(err => {
                    console.log(err);
                    reject(err);
                });
                
            },
            (err) => {
                console.log('--> ERROR from API AppDefaults ...')
                console.log(err);
                reject(err);
            },
            "POST",
            { "objName": objectName },
            { "Content-type":"application/json" },
            null,
            null,
            false
        );
    });

}

function getFieldsFromSoup(){

    const query = "select {fields:field} from {fields} WHERE {fields:objectName}='Lead'";
    const querySpec = smartstore.buildSmartQuerySpec(query, 100);
    return new Promise((resolve, reject)=>{
        smartstore.runSmartQuery(false,
            querySpec,
            (cursor) => {
                console.log(cursor);
                resolve(cursor);
            },
            (querySoupErr) => {
                console.log(querySoupErr);
                reject(querySoupErr);
            }
        ); 
    });    
}

function filterFields(fieldList, objName){
    let finalFieldList = [];
    for(let i=0; i<fieldList.length; i++){
        let _f = fieldList[i].replace(objName+".", "");
        finalFieldList.push(_f);
    }
    return finalFieldList;
}

function firstTimeSyncData() {   

    return getObjectFields("Lead").then((resp)=>{
        console.log(resp);
        return registerSoup(false,
            "leads", 
            [ {path:"Id", type:"string"}, 
              {path:"FirstName", type:"full_text"}, 
              {path:"LastName", type:"full_text"}, 
              {path:"__local__", type:"string"} ])
        .then(resp => {
            getFieldsFromSoup().then((res) => {
                syncDownLeads(res.currentPageOrderedEntries);
            }).catch((err) => {
                console.log(err);
            });
        })
        .catch(err => {
            console.log(err);
        });
    }).catch((err)=>{
        return Promise.reject(err);
    });

    

    /*

    return registerSoup(false,
        "leads", 
        [ {path:"Id", type:"string"}, 
        {path:"FirstName", type:"full_text"}, 
        {path:"LastName", type:"full_text"}, 
        {path:"__local__", type:"string"} ])
    .then(syncDownLeads);

    */

}

function syncData() {
    return getSyncStatus(false, syncName)
        .then((sync) => {
            if (sync == null) {
                return firstTimeSyncData();
            } else {
                return reSyncData();
            }
        });
}

function reSyncData() {
    return getFieldsFromSoup().then(resp => {
        return syncUpLeads(resp.currentPageOrderedEntries).then(reSyncLeads);
    }).catch(err => {
        console.log(err);
        return new Promise.reject(err);
    });
}

function addStoreChangeListener(listener) {
    eventEmitter.addListener(SMARTSTORE_CHANGED, listener);
}

function saveLead(lead, callback) {
    smartstore.upsertSoupEntries(false, "leads", [lead],
                                 () => {
                                     callback();
                                     emitSmartStoreChanged();
                                 });
}

function addLead(successCallback, errorCallback) {

    getFieldsFromSoup().then(resp => {

        let lead = {
            Id: `local_${(new Date()).getTime()}`,
            //FirstName: null, LastName: null, Title: null, Email: null, MobilePhone: null, 
            attributes: {type: "Lead"},
            __locally_created__: true,
            __locally_updated__: false,
            __locally_deleted__: false,
            __local__: true
        };

        for(let i=0; i<resp.currentPageOrderedEntries.length; i++){
            if(resp.currentPageOrderedEntries[i][0] !== "Id"){
                lead[resp.currentPageOrderedEntries[i][0]] = null;
            }            
        }        
        smartstore.upsertSoupEntries(false, "leads", [ lead ],
                                 (leads) => successCallback(leads[0]),
                                 errorCallback);

    }).catch(errorCallback);
        
}

function deleteLead(lead, successCallback, errorCallback) {
    smartstore.removeFromSoup(false, "leads", [ lead._soupEntryId ],
                              successCallback,
                              errorCallback);
}

function traverseCursor(accumulatedResults, cursor, pageIndex, successCallback, errorCallback) {
    accumulatedResults = accumulatedResults.concat(cursor.currentPageOrderedEntries);
    if (pageIndex < cursor.totalPages - 1) {
        smartstore.moveCursorToPageIndex(false, cursor, pageIndex + 1,
                                         (cursor) => {
                                             traverseCursor(accumulatedResults, cursor, pageIndex + 1, successCallback, errorCallback);
                                         },
                                         errorCallback);
    }
    else {
        successCallback(accumulatedResults);
    }
}

function searchLeads(query, successCallback, errorCallback) {
    let querySpec;
    
    if (query === "") {
        querySpec = smartstore.buildAllQuerySpec("LastName", "ascending", 100);
    }
    else {
        const queryParts = query.split(/ /);
        const queryFirst = queryParts.length == 2 ? queryParts[0] : query;
        const queryLast = queryParts.length == 2 ? queryParts[1] : query;
        const queryOp = queryParts.length == 2 ? "AND" : "OR";
        const match = `{leads:FirstName}:${queryFirst}* ${queryOp} {leads:LastName}:${queryLast}*`;
        querySpec = smartstore.buildMatchQuerySpec(null, match, "ascending", 100, "LastName");
    }
    const that = this;

    lastStoreQuerySent++;
    const currentStoreQuery = lastStoreQuerySent;

    const querySuccessCB = (leads) => {
        successCallback(leads, currentStoreQuery);
    };

    const queryErrorCB = (error) => {
        console.log(`Error->${JSON.stringify(error)}`);
        errorCallback(error);
    };

    smartstore.querySoup(false,
                         "leads",
                         querySpec,
                         (cursor) => {
                             console.log(`Response for #${currentStoreQuery}`);
                             if (currentStoreQuery > lastStoreResponseReceived) {
                                 lastStoreResponseReceived = currentStoreQuery;
                                 traverseCursor([], cursor, 0, querySuccessCB, queryErrorCB);
                             }
                             else {
                                 console.log(`IGNORING Response for #${currentStoreQuery}`);
                             }
                         },
                         queryErrorCB);

}


export default {
    syncData,
    reSyncData,
    addStoreChangeListener,
    saveLead,
    searchLeads,
    addLead,
    deleteLead,
};
