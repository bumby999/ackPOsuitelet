/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * 
 * 
 * Client script to accompany PO Acknowledgement Suitelet.
 * 
 */
define(['N/currentRecord', 'N/search', 'N/log'],

function(currentRecord, search, log) {
    

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
		

        
		var rec = scriptContext.currentRecord;
		var poIdSelected = rec.getValue({fieldId: 'custpage_ponumber'});
		
	if(scriptContext.fieldId == 'custpage_ponumber' && poIdSelected && poIdSelected != 0){
		
		var lineCountStart = rec.getLineCount({sublistId: 'custpage_table'});
		console.log('lineCountStart:', lineCountStart);
		
		for(var z = lineCountStart - 1; z >= 0; z--){
		//remove any existing lines from our sublist
				//rec.selectLine({sublistId: 'custpage_table', line: z});
				rec.removeLine({sublistId: 'custpage_table', line: z});
		}

		//search to get PO lines
		var purchaseorderSearchObj = search.create({
		   type: "purchaseorder",
		   filters:
		   [
			  ["type","anyof","PurchOrd"], 
			  "AND", 
			  ["mainline","is","F"],
			  "AND", 
			  ["internalid","anyof", poIdSelected]
		   ],
		   columns:
		   [
			  search.createColumn({name: "trandate", sort: search.Sort.ASC, label: "Date"}),
			  search.createColumn({name: "tranid", label: "Document Number"}),
			  search.createColumn({name: "item", label: "Item"}),
			  search.createColumn({name: "custcol_item_mpn_po", label: "MPN"}),
			  search.createColumn({name: "displayname", join: "item", label: "Display Name"}),
			  search.createColumn({name: "salesdescription", join: "item", label: "Description"}),
			  search.createColumn({name: "formulatext", formula: "{entity}", label: "Formula (Text)"}),
			  search.createColumn({name: "quantity", label: "Quantity"}),
			  search.createColumn({name: "rate", label: "Item Rate"}),
			  search.createColumn({name: "amount", label: "Amount"}),
			  search.createColumn({name: "altname", join: "vendor", label: "Name"}),
			  search.createColumn({name: "custcol_ack_quantity", label: "Acknowledged Quantity"}),
			  search.createColumn({name: "custcolacknowledgement_number", label: "Acknowledgement #"}),
			  search.createColumn({name: "custcol_ack_total", label: "Acknowledgement Total"}),
			  search.createColumn({name: "custcol1", label: "Acknowledgment Balances"}),
			  search.createColumn({name: "custcol_ack_dates", label: "Date of Acknowledgement"}),
			  search.createColumn({name: "custcol_fls_item_details", label: "Details"}),
			  search.createColumn({name: "custcol_wholesale_cost", label: "Wholesale"}),
			  search.createColumn({name: "line", label: "Line ID"})
		   ]
		});
		var searchResultCount = purchaseorderSearchObj.runPaged().count;
		log.debug("CS: purchaseorderSearchObj result count",searchResultCount);
		
		//var sublistObj = form.getSublist({id: 'custpage_table'});
		
		
		var j = 0;
		purchaseorderSearchObj.run().each(function(result){

				//set sublist lines
				//sublistObj.setSublistValue({id: 'purchorder', line : j, value : result.getValue({name: 'tranid'})});
				rec.selectNewLine({sublistId: 'custpage_sublist'});
				
				//rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'purchorder', value: result.getValue({name: 'tranid'})});
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'itemname', value: result.getText({name: 'item'})});
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantity', value: result.getValue({name: 'quantity'})});
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'unitprice', value: result.getValue({name: 'rate'})});
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'lineid', value: result.getValue({name: 'line'})});
				
				var mpn = result.getValue({name: 'custcol_item_mpn_po'});
				if(mpn && mpn != null && mpn != 'undefined'){
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'mpn', value: mpn});
				}
				
				var displayName = result.getValue({name: 'displayname', join: 'item'});
				if(displayName && displayName != null && displayName != 'undefined'){
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'displayname', value: displayName});
				}
				
				var itemDesc = result.getValue({name: 'custcol_fls_item_details'});
				if(itemDesc && itemDesc != null && itemDesc != 'undefined'){
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'itemdescription', value: itemDesc});
				}
				
				var vendor = result.getValue({name: 'altname', join: 'vendor'});
				//if(vendor && vendor != null && vendor != 'undefined'){
				//rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'vendor', value: vendor});
				//}
				
				var ackTotalQty = result.getValue({name: 'custcol_ack_quantity'});
				if(ackTotalQty && ackTotalQty != null && ackTotalQty != 'undefined'){
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd', value: ackTotalQty});
				}
				else{
				rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd', value: 0});	
				}
				
				//var ackTotal = result.getValue({name: 'custcol_ack_total'});
		if(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack'}) < rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd'})){
				
			var ackLineTotal = Number(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack'})) * Number(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'unitprice'}));
			rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'dollartotalackd', value: ackLineTotal});

		}
				
				var ackNumber = result.getValue({name: 'custcolacknowledgement_number'});
				if(ackNumber && ackNumber != null && ackNumber != 'undefined'){
					rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'acknmber', value: ackNumber});
				}
				
				var ackDates = result.getValue({name: 'custcol_ack_dates'});
				if(ackDates && ackDates !== null && ackDates !== 'undefined'){
					rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'ackentrydate', value: ackDates});
				}
				
				var wholesaleCost = result.getValue({name: 'custcol_wholesale_cost'});
				if(wholesaleCost){
					rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'wholesale', value: wholesaleCost});
				}
				
				rec.commitLine({sublistId: 'custpage_table'});
				
				//log.debug('CS: Set lines');


		j++;
		return true;		
		});					

		
		
		
		    
        
		
		
		
		//disable fields
		var lineCountStart = rec.getLineCount({sublistId: 'custpage_table'});
		for(var e = 0; e < lineCountStart; e++){
			
			//var poColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'purchorder', line: e});
			//poColumn.isDisabled = true;
			
			var itemColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'itemname', line: e});
			itemColumn.isDisabled = true;
			
			var mpnColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'mpn', line: e});
			mpnColumn.isDisabled = true;
			
			var displayNameColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'displayname', line: e});
			displayNameColumn.isDisabled = true;
			
			var itemDescColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'itemdescription', line: e});
			itemDescColumn.isDisabled = true;
			
			//var vendorColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'vendor', line: e});
			//vendorColumn.isDisabled = true;
			
			//var unitPriceColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'unitprice', line: e});
			//unitPriceColumn.isDisabled = true;
			
			var qtyColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'quantity', line: e});
			qtyColumn.isDisabled = true;
			
			var qtyAlreadyAckdColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd', line: e});
			qtyAlreadyAckdColumn.isDisabled = true;
			
			var ackNumberColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'acknmber', line: e});
			ackNumberColumn.isDisabled = true;
			
			var dateOfAckColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'ackentrydate', line: e});
			dateOfAckColumn.isDisabled = true;
			
			var dollarTotalAckColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'dollartotalackd', line: e});
			dollarTotalAckColumn.isDisabled = true;
			
			var wholesaleColumn = rec.getSublistField({sublistId: 'custpage_table', fieldId: 'wholesale', line: e});
			wholesaleColumn.isDisabled = true;
			
		}
	
	}//end if fieldId is custpage_ponumber
	
/**	
	//now do the calculation of possible diff between selected lines total and the TOTAL ACK header field
	if(scriptContext.fieldId == 'custpage_acktotal' && poIdSelected && poIdSelected != 0){
		
		
		var ackHeaderTotal = rec.getValue({fieldId: 'custpage_acktotal'});
		var ackLinesTotal = Number(0);
		
		var lineCount = rec.getLineCount({sublistId: 'custpage_table'});
		
		for(var x = 0; x < lineCount; x++){
			
			console.log('x is:', x);
			var qtyToAckLine = rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack', line: x});
			var ackLinePrice = Number(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'unitprice', line: x}));
			
			ackLinesTotal += Number(qtyToAckLine) * Number(ackLinePrice);
			
		}//end for loop
		
		console.log('ackLinesTotal is:', ackLinesTotal);
		//throw alert here
		if(ackLinesTotal != ackHeaderTotal && ackHeaderTotal != 0){
			
			alert('ACK TOTAL and lines total does not match!');
			rec.setValue({fieldId: 'custpage_acktotal', value: 0});
		}
		
		
	}//end if fieldId is custpage_acktotal
**/	

 }//end fieldChanged function



	function sublistChanged(scriptContext){
	
		console.log('Start SC');
		var rec = scriptContext.currentRecord;
		var poIdSelected = rec.getValue({fieldId: 'custpage_ponumber'});
		
		
			var lineCount = rec.getLineCount({sublistId: 'custpage_table'});
			
			var ackCalcTotal = Number(0);			

			for(var y = 0; y < lineCount; y++){
					 
			
				if(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'check', line: y}) == true && rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack', line: y}) > 0){
					
					//var qty = rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack', line: y});
					ackCalcTotal += Number(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'unitprice', line: y}) * Number(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack', line: y})));
					console.log('SC: ackCalcTotal line ' + y + ':', ackCalcTotal);
						//rec.setValue({fieldId: 'custpage_calcacktotal', value: ackCalcTotal});
						 
		
				}//end if
				

				
			}
		//Set the CALCULATED ACK TOTAL field in the header
			var currentAckHeaderTotal = Number(rec.getValue({fieldId: 'custpage_calcacktotal'}));
			
		
			rec.setValue({fieldId: 'custpage_calcacktotal', value: ackCalcTotal});
			console.log('SC: Set CALC ACK TOTAL value to:', ackCalcTotal);
			
	
		ackCalcTotal = 0;



		//var qtySublistField = rec.getField({fieldId: 'quantity'});
            //qtySublistField.isDisabled = true;



		
		return true;
		
		
	
	}


	function validateLine(scriptContext){
		
		var rec = scriptContext.currentRecord;
		
		var ackLineTotal = Number(0);
		
		
			if(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'check'}) == true && rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack'}) != 0){
			console.log('VL: Inside IF');
			
			
					var qtyToAckLine = parseInt(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack'}));
					var qtyLine = parseInt(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantity'}));
					var qtyAlreadyAckedLine = parseInt(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd'}));
						console.log('VL: ' + qtyToAckLine +' / '+ qtyLine +' / '+ qtyAlreadyAckedLine);
						
						var remainingQtyToAck = parseInt(qtyLine) - parseInt(qtyAlreadyAckedLine);
					
					if(parseInt(qtyToAckLine) > parseInt(remainingQtyToAck)){
							console.log('VL: inside now');
						alert('QTY TO ACK on line '+ Number(rec.getCurrentSublistIndex({sublistId: 'custpage_table'}) + 1) + ' is too high!');	
					
						return false;
					}
			

			
					var ackLinePrice = Number(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'unitprice'}));
					
					ackLineTotal += qtyToAckLine * Number(ackLinePrice);
					console.log('ackLinesTotal is now:', ackLineTotal);
					
					rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'dollartotalackd', value: ackLineTotal});
					console.log('VL: set value');
			}
			
		
							
				//set the QTY TO ACK back to it's default value if the user has not checked that line
				if(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'check'}) == false){
	
					rec.setCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack', value: Number(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantity'})) - Number(rec.getCurrentSublistValue({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd'}))});
				
				}//end if
		
		
		
		
		
		return true;
	}
	
	
	function saveRecord(scriptContext){
		
		var rec = scriptContext.currentRecord;
		var ackHeaderTotal = rec.getValue({fieldId: 'custpage_acktotal'});
		var ackLinesTotal = Number(0);
		//var ackNumber = rec.getvalue({fieldId: 'custpage_acknumber'});
		
		if(!rec.getValue({fieldId: 'custpage_acknumber'})){
			alert('Please enter ACK #!');
			return false;
		}
		
		var lineCount = rec.getLineCount({sublistId: 'custpage_table'});
		
		for(var x = 0; x < lineCount; x++){
			
				console.log('x is:', x);
				var qtyLine = rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantity', line: x});
				var qtyToAckLine = rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantitytoack', line: x});
				var ackLinePrice = Number(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'unitprice', line: x}));
				var qtyAlreadyAckedLine = Number(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd', line: x}));
				
				if(rec.getSublistValue({sublistId: 'custpage_table', fieldId: 'check', line: x}) == true){
					
					ackLinesTotal += Number(qtyToAckLine) * Number(ackLinePrice);
					
					if(Number(qtyToAckLine) > (Number(qtyLine) + Number(qtyAlreadyAckedLine))){
						alert('QTY TO ACK on line '+ Number(x + 1) + ' is too high!');	
					
					return false;
					}
					
				}//end if line is checked
				
		}//end for loop
		
		console.log('ackLinesTotal is:', ackLinesTotal);
		//throw alert here
		if(ackLinesTotal != ackHeaderTotal){
			
			alert('ACK TOTAL and lines total does not match!');
			rec.setValue({fieldId: 'custpage_acktotal', value: 0});
			
			return false;
		}
		
		
		
		return true;
	}
	
	

    return {

        fieldChanged: fieldChanged,
		sublistChanged: sublistChanged,
		validateLine: validateLine,
		saveRecord: saveRecord

    };
    
});
