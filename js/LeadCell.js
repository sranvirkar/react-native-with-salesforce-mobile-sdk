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
import { ListItem } from 'react-native-elements';
import LeadBadge from './LeadBadge';

class LeadCell extends React.Component {
    render() {
        let statusIcon;
        if (this.props.lead.__local__) {
            if (this.props.lead.__locally_updated__) statusIcon = {name: 'sync', color:'blue'};
            if (this.props.lead.__locally_created__) statusIcon = {name: 'add', color:'green'};
            if (this.props.lead.__locally_deleted__) statusIcon = {name: 'delete', color:'red'};
            if (this.props.lead.__last_error__) statusIcon = {name: 'sync-problem', color: 'red'};
        }

        const fullName = [this.props.lead.FirstName, this.props.lead.LastName].filter(x=>x).join(' ')
        const title = this.props.lead.Title;
        
        return (<ListItem
                key={fullName}
                leftIcon={<LeadBadge lead={this.props.lead}/>}
                title={fullName}
                subtitle={title}
                rightIcon={statusIcon}
                onPress={this.props.onSelect}
                />);
    }
}

export default LeadCell;
