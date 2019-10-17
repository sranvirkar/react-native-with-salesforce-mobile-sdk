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

import React from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    View,
    TouchableHighlight,
    Text
} from 'react-native';

import styles from './Styles';
import NavImgButton from './NavImgButton';
import Field from './Field';
import storeMgr from './StoreMgr';
import { Card, Button } from 'react-native-elements';

const ignoreFields = ["LastModifiedDate", "attributes", "Id", "__local__", "__locally_created__", "__locally_deleted__", "__locally_updated__", "__sync_id__", "_soupEntryId", "_soupLastModifiedDate", "__proto__", "__last_error__"];

// State: lead
// Props: lead
class LeadScreen extends React.Component {
    static navigationOptions = ({ navigation }) => {
        const { params = {} } = navigation.state;
        var deleteUndeleteIconName = 'delete';
        if (params.lead.__locally_deleted__) {
            deleteUndeleteIconName = 'delete-restore';
        } 
        
        return {
            title: 'Lead',
            headerLeft: (<NavImgButton icon='arrow-back' color='white' onPress={() => params.onBack()} />),
            headerRight: (
                    <View style={styles.navButtonsGroup}>
                        <NavImgButton icon={deleteUndeleteIconName} iconType='material-community' onPress={() => params.onDeleteUndeleteLead()} />
                    </View>
            )
        };
    }

    constructor(props) {
        super(props);
        this.state = { lead: this.props.navigation.getParam('lead', {}) };
        this.onBack = this.onBack.bind(this);
        this.onSave = this.onSave.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onDeleteUndeleteLead = this.onDeleteUndeleteLead.bind(this);
    }

    componentDidMount() {
        this.props.navigation.setParams({
            onBack: this.onBack,
            onDeleteUndeleteLead: this.onDeleteUndeleteLead,
            lead: this.state.lead
        });
    }
    
    onBack() {
        const lead = this.state.lead;
        const navigation = this.props.navigation;
        if (lead.__locally_created__ && !lead.__locally_modified__) {
            // Nothing typed in - delete
            storeMgr.deleteLead(lead, () => navigation.pop());
        }
        else {
            navigation.pop()
        }
    }

    onSave() {
        const lead = this.state.lead;
        const navigation = this.props.navigation;
        lead.__last_error__ = null;
        lead.__locally_updated__ = lead.__local__ = true;
        storeMgr.saveLead(lead, () => navigation.pop());
    }
    
    onChange(fieldKey, fieldValue) {
        const lead = this.state.lead;
        lead[fieldKey] = fieldValue;
        this.setState({lead});
    }

    onDeleteUndeleteLead() {
        var lead = this.state.lead;
        const navigation = this.props.navigation;
        lead.__locally_deleted__ = !lead.__locally_deleted__;
        lead.__local__ = lead.__locally_deleted__ || lead.__locally_updated__ || lead.__locally_created__;
        storeMgr.saveLead(lead, () => {navigation.pop()});
    }

    renderErrorIfAny() {
        var errorMessage = null;
        const lastError = this.state.lead.__last_error__;
        if (lastError) {
            try {
                if (Platform.OS == 'ios') {
                    errorMessage = new RegExp('.*message = "([^"]*)".*', 'm').exec(lastError)[1];
                } else {
                    errorMessage = JSON.parse(lastError)[0].message;
                }
            }
            catch (e) {
                console.log("Failed to extract message from error: " + lastError);
            }
        }

        if (errorMessage == null) {
            return null;
        } else {

            return (
                    <View style={{marginTop:10}}>
                    <Button
                      icon={{name: 'error', size: 15, color: 'white'}}
                      title={errorMessage}
                      buttonStyle={{backgroundColor:'red'}}
                    />
                    </View>
            );
        }
    }

    renderSaveButton() {
        return (
                <View style={{marginTop:10}}>
                <Button
                  backgroundColor='blue'
                  containerStyle={{alignItems:'stretch'}}
                  icon={{name: 'save'}}
                  title='Save'
                  onPress={this.onSave}
                />
                </View>
        );
    }
    
    render() {
        return (
                <ScrollView>
                  <View style={this.props.style}>
                    {this.renderErrorIfAny()}
                    {
                        Object.keys(this.state.lead).map((key) => {
                            if(ignoreFields.indexOf(key) === -1){
                                return <Field key={key} fieldLabel={key} fieldValue={this.state.lead[key]} onChange={(text) => this.onChange(key, text)} />
                            }
                        })
                    }
                    {this.renderSaveButton()}
                  </View>
                </ScrollView>
               );
    }
}

export default LeadScreen;
