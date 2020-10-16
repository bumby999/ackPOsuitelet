/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * 
 * 
 * PO Acknowledgement Suitelet
 * 
 * 
 */

define(['N/ui/serverWidget', 'N/search', 'N/redirect', 'N/runtime', 'N/record', 'N/format', 'N/redirect'],
    function (serverWidget, search, redirect, runtime, record, format, redirect) {
		
		var scriptObj = runtime.getCurrentScript();
		var PO_DROPDOWN_SEARCH = scriptObj.getParameter({name: 'custscript_search_to_load_sl'});
		var CLIENT_SCRIPT_FILE_ID = scriptObj.getParameter({name: 'custscript_client_fileid_sl'});
		
		
		
    function onRequest(context) {
		

      if (context.request.method == 'GET'){
			
			//log governance remaining
			var scriptObj = runtime.getCurrentScript();
			log.debug("Starting GET: ", scriptObj.getRemainingUsage());
			
			var poIdInput = '';
			var PO_ID = '';
			var ackNumber = '';
			var ackTotal = '';
		
		
			//get url parameter of vendorid and filter PO lines by that
			var vendorId = context.request.parameters.vendorid;
			log.debug('vendorId is:', vendorId);
		
		if(vendorId){		
			//lookup Vendor name
			var vendSearchLookupObj = search.lookupFields({type: record.Type.VENDOR, id: Number(vendorId), columns: ['altname']});
			var vendorName = vendSearchLookupObj.altname;
			log.debug('vendorName is:', vendorName);
				
            var form = serverWidget.createForm({
                    title : 'PO Acknowledgement - ' + vendorName,
                    hideNavBar : false
                });
		}
		else{
			
			var form = serverWidget.createForm({
                    title : 'PO Acknowledgement',
                    hideNavBar : false
                });
			
			
			
		}
            form.clientScriptFileId = CLIENT_SCRIPT_FILE_ID;

			//add fields for user input
			var poNumberField = form.addField({
                    id: 'custpage_ponumber',
                    type: serverWidget.FieldType.SELECT,
                    label: 'PO #'
                });
                poNumberField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //poNumberField.breakType = serverWidget.FieldBreakType.STARTCOL;
				poNumberField.addSelectOption({value: 0, text: '- Select One -'});
                poNumberField.isMandatory = true;
				
			//the acknowledgement number
			var ackNumberField = form.addField({
                    id: 'custpage_acknumber',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Ack #'
                });
                ackNumberField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //ackNumberField.breakType = serverWidget.FieldBreakType.STARTCOL;
                ackNumberField.isMandatory = false;
				
			//the ack total
			var ackTotalField = form.addField({
                    id: 'custpage_acktotal',
                    type: serverWidget.FieldType.CURRENCY,
                    label: 'Ack Total'
                });
                ackTotalField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //ackTotalField.breakType = serverWidget.FieldBreakType.STARTROW;
                ackTotalField.isMandatory = false;
				
			//shows the calculated acknowledged total upon Submit
			var calcAckTotalField = form.addField({
                    id: 'custpage_calcacktotal',
                    type: serverWidget.FieldType.CURRENCY,
                    label: 'Calc Ack Total'
                });
                calcAckTotalField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //calcAckTotalField.breakType = serverWidget.FieldBreakType.STARTROW;
                calcAckTotalField.isMandatory = false;
				
			form.addPageLink({
				type : serverWidget.FormPageLinkType.CROSSLINK,
				title : 'Return to Vendor List',
				url : '/app/common/search/searchresults.nl?searchid=1088&whence='
			});	
			

            // Add sublist that will show results
            var sublist = form.addSublist({id : 'custpage_table', type : serverWidget.SublistType.INLINEEDITOR, label : 'PO Lines'});

            // Add columns to be shown on Page
			sublist.addField({id : 'check', label : 'Process', type : serverWidget.FieldType.CHECKBOX});
            //sublist.addField({id : 'purchorder', label : 'Purchase Order', type : serverWidget.FieldType.TEXT});
            sublist.addField({id : 'itemname', label : 'Item', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'mpn', label : 'MPN', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'displayname', label : 'Display Name', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'itemdescription', label : 'Item Description', type : serverWidget.FieldType.TEXT});
			//sublist.addField({id : 'vendor', label : 'Vendor', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'wholesale', label : 'Wholesale', type : serverWidget.FieldType.CURRENCY});
			sublist.addField({id : 'unitprice', label : 'Unit Price', type : serverWidget.FieldType.TEXT});
			var qtySublistField = sublist.addField({id : 'quantity', label : 'Quantity', type : serverWidget.FieldType.TEXT});
			qtySublistField.isDisabled = true;
			sublist.addField({id : 'quantityalreadyackd', label : 'Qty Already Ackd', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'quantitytoack', label : 'Qty to Ack', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'dollartotalackd', label : 'Total Ackd', type : serverWidget.FieldType.CURRENCY});
			sublist.addField({id : 'acknmber', label : 'Ack #', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'ackentrydate', label : 'Date of Ack', type : serverWidget.FieldType.TEXT});
			var lineIdSublistField = sublist.addField({id : 'lineid', label : 'Line ID', type : serverWidget.FieldType.TEXT});
			lineIdSublistField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
			
			//add SUBMIT button
			form.addSubmitButton({
                label: 'Submit',
					
            });
			
			
		var poDropDownSearchObj = search.create({
		   type: "purchaseorder",
			   filters:
			   [
				  ["type","anyof","PurchOrd"], 
				  "AND", 
				  ["formulanumeric: CASE WHEN {quantityshiprecv} < {quantity} THEN 1 ELSE 0 END","equalto","1"], 
				  "AND", 
				  ["mainline","is","F"], 
				  "AND",
				  ["vendor.internalid","anyof", vendorId], 
			      "AND", 				  
				  ["status","anyof","PurchOrd:D","PurchOrd:E","PurchOrd:B"],  //Partially Received, Pending Billing/Partially Received or Pending Receipt
				  "AND", 
				  ["formulanumeric: CASE WHEN {custcol_ack_quantity} IS NULL OR {custcol_ack_quantity} < {quantity} THEN 1 ELSE 0 END","equalto","1"]
			   ],
			   columns:
			   [
				  search.createColumn({name: "internalid", summary: "GROUP", label: "Internal ID"}),
				  search.createColumn({name: "tranid", summary: "GROUP", label: "Document Number"})
			   ]
		}); 
		
		poDropDownSearchObj.run().each(function(result){	
			//add dropdown select options for PO NUMBER field
				poNumberField.addSelectOption({value: result.getValue({name: "internalid", summary: "GROUP"}), text: result.getValue({name: "tranid", summary: "GROUP"})});
	
		return true;
		});


			
/**	
	if(vendorId){
		
		var purchaseorderSearchObj = search.create({
		   type: "purchaseorder",
		   filters:
		   [
			["type","anyof","PurchOrd"], 
			"AND", 
			["mainline","is","F"], 
			"AND", 
			["vendor.internalid","anyof", Number(vendorId)], 
			"AND", 
			["status","anyof","PurchOrd:D","PurchOrd:E","PurchOrd:B"]
		   ],
		   columns:
		   [
			  search.createColumn({name: "trandate", sort: search.Sort.ASC, label: "Date"}),
			  search.createColumn({name: "tranid", label: "Document Number"}),
			  search.createColumn({name: "item", label: "Item"}),
			  search.createColumn({name: "displayname", join: "item", label: "Display Name"}),
			  search.createColumn({name: "salesdescription", join: "item", label: "Description"}),
			  search.createColumn({name: "custcol_item_mpn_po", label: "MPN"}),
			  search.createColumn({name: "formulatext", formula: "{entity}", label: "Formula (Text)"}),
			  search.createColumn({name: "quantity", label: "Quantity"}),
			  search.createColumn({name: "rate", label: "Item Rate"}),
			  search.createColumn({name: "amount", label: "Amount"}),
			  search.createColumn({name: "altname", join: "vendor", label: "Name"}),
			  search.createColumn({name: "custcol_ack_quantity", label: "Acknowledged Quantity"}),
			  search.createColumn({name: "custcol_ack_total", label: "Ack. Total"}),
			  search.createColumn({name: "custcolacknowledgement_number", label: "Acknowledgement #"}),
			  search.createColumn({name: "custcol_ack_total", label: "Acknowledgement Total"}),
			  search.createColumn({name: "custcol1", label: "Acknowledgment Balances"}),
			  search.createColumn({name: "custcol_date_acknowledgement", label: "Date of Acknowledgement"}),
			  search.createColumn({name: "custcol_ack_dates", label: "Date of Acknowledgement"}),
			  search.createColumn({name: "line", label: "Line ID"})
		   ]
		});
		var searchResultCount = purchaseorderSearchObj.runPaged().count;
		log.debug("GET: purchaseorderSearchObj result count",searchResultCount);
		var j = 0;
		purchaseorderSearchObj.run().each(function(result)
		{

			//if the total qty already ackd is less than the line quantity, we proceed
			//and only show 75 lines
			//if(result.getValue({name: 'custcol_ack_quantity'}) < result.getValue({name: 'quantity'}) && j < 75){
			
                sublist.setSublistValue({id: 'purchorder', line : j, value : result.getValue({name: 'tranid'})});
				
                sublist.setSublistValue({id: 'itemname', line : j, value : result.getText({name: 'item'})});
				
				if(result.getValue({name: 'custcol_item_mpn_po'})){
					sublist.setSublistValue({id: 'mpn', line : j, value : result.getValue({name: 'custcol_item_mpn_po'})});
				}
				
				if(result.getValue({name: 'displayname', join: 'item'})){
				sublist.setSublistValue({id: 'displayname', line : j, value : result.getValue({name: 'displayname', join: 'item'})});
				}
				
				if(result.getValue({name: 'salesdescription', join: 'item'})){
					sublist.setSublistValue({id: 'itemdescription', line : j, value : result.getValue({name: 'salesdescription', join: 'item'})});
				}
				
				if(result.getValue({name: 'altname', join: 'vendor'})){
					sublist.setSublistValue({id: 'vendor', line : j, value : result.getValue({name: 'altname', join: 'vendor'})});
				}
				
				var qtyAlreadyAckd = result.getValue({name: 'custcol_ack_quantity'});
				if(qtyAlreadyAckd && qtyAlreadyAckd != 0 && qtyAlreadyAckd !== null && qtyAlreadyAckd !== 'undefined' ){
					sublist.setSublistValue({id: 'quantityalreadyackd', line : j, value : qtyAlreadyAckd});
				}
				else{
					qtyAlreadyAckd = Number(0);
					sublist.setSublistValue({id: 'quantityalreadyackd', line : j, value : Number(0).toFixed(0)});
				}
				
				sublist.setSublistValue({id: 'dollartotalackd', line: j, value: 0});
				
				
				log.debug('custcol_ack_dates is:', result.getValue({name: 'custcol_ack_dates'}));
				if(result.getValue({name: 'custcol_ack_dates'})){
					sublist.setSublistValue({id: 'ackentrydate', line: j, value: result.getValue({name: 'custcol_ack_dates'})});
				}
				var qtyFound = result.getValue({name: 'quantity'});
				sublist.setSublistValue({id: 'unitprice', line : j, value : result.getValue({name: 'rate'})});
				sublist.setSublistValue({id: 'quantity', line : j, value : qtyFound});
				sublist.setSublistValue({id: 'lineid', line : j, value : result.getValue({name: 'line'})});
				
				sublist.setSublistValue({id: 'quantitytoack', line: j, value: Number(qtyFound - qtyAlreadyAckd).toFixed(0)});
			

                j++;
				log.debug('j is now:', j);
			//}
				return true;
            });
			
			
			
			
	  }//end if vendorId
**/ 
            context.response.writePage(form);
			log.debug("Remaining governance units in GET: ", scriptObj.getRemainingUsage());

		 
 } else {
			var scriptObj = runtime.getCurrentScript();
			log.debug('STARTING POST');
			
			//get user input
			var poIdInput = context.request.parameters.custpage_ponumber;
			log.debug('poIdInput is:', poIdInput);
			
			//find PO internalid given document number 
			var ackNumberInput = context.request.parameters.custpage_acknumber;
			log.debug('ackNumberInput is:', ackNumberInput);
				
			var ackTotalInput = context.request.parameters.custpage_acktotal;
			log.debug('ackTotalInput is:', ackTotalInput);
				
            var form = serverWidget.createForm({
                    title : 'PO Acknowledgement',
                    hideNavBar : false
                });

            form.clientScriptFileId = CLIENT_SCRIPT_FILE_ID;

			//add fields for user input
			var poNumberField = form.addField({
                    id: 'custpage_ponumber',
                    type: serverWidget.FieldType.SELECT,
                    label: 'PO #'
                });
                poNumberField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //poNumberField.breakType = serverWidget.FieldBreakType.STARTCOL;
				poNumberField.addSelectOption({value: 0, text: '- Select One -'});
                poNumberField.isMandatory = true;
			//add a blank field for user input
			//this might hold the acknowledgement number
			var ackNumberField = form.addField({
                    id: 'custpage_acknumber',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Ack #'
                });
                ackNumberField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //ackNumberField.breakType = serverWidget.FieldBreakType.STARTCOL;
                ackNumberField.isMandatory = false;
				
			//add another blank text field for a second input
			var ackTotalField = form.addField({
                    id: 'custpage_acktotal',
                    type: serverWidget.FieldType.CURRENCY,
                    label: 'Ack Total'
                });
                ackTotalField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //ackTotalField.breakType = serverWidget.FieldBreakType.STARTROW;
                ackTotalField.isMandatory = false;
				
			//shows the calculated acknowledged total upon Submit
			var calcAckTotalField = form.addField({
                    id: 'custpage_calcacktotal',
                    type: serverWidget.FieldType.CURRENCY,
                    label: 'Calc Ack Total'
                });
                calcAckTotalField.layoutType = serverWidget.FieldLayoutType.NORMAL;
                //calcAckTotalField.breakType = serverWidget.FieldBreakType.STARTROW;
                calcAckTotalField.isMandatory = false;
				
			form.addPageLink({
				type : serverWidget.FormPageLinkType.CROSSLINK,
				title : 'Return to Vendor List',
				url : '/app/common/search/searchresults.nl?searchid=1088&whence='
			});	


            // Add sublist that will show results
            var sublist = form.addSublist({id : 'custpage_table', type : serverWidget.SublistType.INLINEEDITOR, label : 'PO Lines'});

            // Add columns to be shown on Page
            sublist.addField({id : 'check', label : 'Process', type : serverWidget.FieldType.CHECKBOX});
            //sublist.addField({id : 'purchorder', label : 'Purchase Order', type : serverWidget.FieldType.TEXT});
            sublist.addField({id : 'itemname', label : 'Item', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'mpn', label : 'MPN', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'displayname', label : 'Display Name', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'itemdescription', label : 'Item Description', type : serverWidget.FieldType.TEXT});
			//sublist.addField({id : 'vendor', label : 'Vendor', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'wholesale', label : 'Wholesale', type : serverWidget.FieldType.CURRENCY});
			sublist.addField({id : 'unitprice', label : 'Unit Price', type : serverWidget.FieldType.CURRENCY});
			var qtySublistField = sublist.addField({id : 'quantity', label : 'Quantity', type : serverWidget.FieldType.TEXT});
			qtySublistField.isDisabled = true;
			sublist.addField({id : 'quantityalreadyackd', label : 'Qty Already Ackd', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'quantitytoack', label : 'Qty to Ack', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'dollartotalackd', label : 'Total Ackd', type : serverWidget.FieldType.CURRENCY});
			sublist.addField({id : 'acknmber', label : 'Ack #', type : serverWidget.FieldType.TEXT});
			sublist.addField({id : 'ackentrydate', label : 'Date of Ack', type : serverWidget.FieldType.TEXT});
			var lineIdSublistField = sublist.addField({id : 'lineid', label : 'Line ID', type : serverWidget.FieldType.TEXT});
			lineIdSublistField.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
			
			//add SUBMIT button
			form.addSubmitButton({
                label: 'Submit',
					
            });
			
/**			
			//add dropdown select options for PO NUMBER field
			var poDropDownSearchObj = search.create({
			   type: "purchaseorder",
			   filters:
			   [
				  ["type","anyof","PurchOrd"], 
				  "AND", 
				  ["mainline","is","T"], 
				  "AND", 
				  ["vendor.internalid","anyof", vendorId], 
				  "AND", 
				  ["status","anyof","PurchOrd:D","PurchOrd:E","PurchOrd:B"]
			   ],
			   columns:
			   [
				  search.createColumn({
					 name: "tranid",
					 sort: search.Sort.ASC,
					 label: "Document Number"
				  }),
				  search.createColumn({name: "item", label: "Item"}),
				  search.createColumn({name: "quantity", label: "Quantity"}),
				  search.createColumn({name: "amount", label: "Amount"}),
				  search.createColumn({name: "line", label: "Line ID"}),
				  search.createColumn({name: "rate", label: "Item Rate"})
			   ]
			});
				poDropDownSearchObj.run().each(function(result){	
	
				poNumberField.addSelectOption({value: result.id, text: result.getValue({name: "tranid"})});
	
			return true;
			});
**/		

	log.debug('context object is:', JSON.stringify(context));
	
	var tableLineCount = context.request.getLineCount({group: 'custpage_table'});		
	
	if(tableLineCount && tableLineCount != 0 && tableLineCount !== null && tableLineCount !== 'undefined'){
		
/**		
	var poNumberArray = [];
	for(var y = 0; y < tableLineCount; y++){	
		
		if(context.request.getSublistValue({group:'custpage_table', name: 'check', line: y}) == true && context.request.getSublistValue({group:'custpage_table', name: 'quantitytoack', line: y}) > 0){
			poNumberArray.push(request.getSublistValue({group:'custpage_table', name: 'purchorder', line: y})); 
		}
	}//end for loop y


		poIdArray = [];
		for(var c = 0; c < poNumberArray.length; c ++){
			
			//search to find id of PO
					var purchaseorderFindIdSearchObj = search.create({
					   type: "purchaseorder",
					   filters:
					   [
						  ["type","anyof","PurchOrd"], 
						  "AND", 
						  ["number","equalto", poNumberArray[c]], 
						  "AND", 
						  ["mainline","is","T"]
					   ],
					   columns:
					   [
						  search.createColumn({name: "tranid", label: "Document Number"})
					   ]
					});
					var searchResultCount = purchaseorderFindIdSearchObj.runPaged().count;
					log.debug("purchaseorderFindIdSearchObj result count",searchResultCount);
					purchaseorderFindIdSearchObj.run().each(function(result){
					   poIdArray.push(result.id);
					   return true;
					});

			
		}//end for loop c

**/		
			
			//for(var s = 0; s < poNumberArray.length; s++){   // && ackTotalInput
				
				var lineObjArray = [];
				var lineTotalArray = [];
				
	
				for(var z = 0; z < tableLineCount; z++){
					
					//if(context.request.getSublistValue({group:'custpage_table', name: 'purchorder', line: z}) == poNumberArray[z]){
							//get the value of the Delete checkbox
							var checkedPOLine = context.request.getSublistValue({group:'custpage_table', name: 'check', line: z});
							var qtyToAckLine = context.request.getSublistValue({group:'custpage_table', name: 'quantitytoack', line: z});
							log.debug('checkedPOLine is:', checkedPOLine);
							
							if(checkedPOLine == 'T' && qtyToAckLine > 0){
									
									var lineObject = {};
									// Get the transaction type
									//var lineId = context.request.getSublistValue({sublistId: 'custpage_table', fieldId: 'lineid', line: z});
									var lineId = context.request.getSublistValue({group: 'custpage_table', name: 'lineid', line: z});
									log.debug('Now working lineId:', lineId);
									lineObject.lineid = lineId;
									
									var qtyToAck = context.request.getSublistValue({group: 'custpage_table', name: 'quantitytoack', line: z});
									lineObject.quantitytoack = qtyToAck;
									
									var unitPrice = context.request.getSublistValue({group: 'custpage_table', name: 'unitprice', line: z});
									lineObject.unitprice = unitPrice;
									
									var lineAckTotal = Number(qtyToAck) * Number(unitPrice);
									log.debug('lineAckTotal for line ' + z + ' is:', lineAckTotal);
									
									lineObject.linetotal = lineAckTotal;
									
									lineTotalArray.push(Number(lineAckTotal));
									lineObjArray.push(lineObject);
							
							}//if box checked
					
					//}
				}//end for loop z
				log.debug('lineObjArray:', lineObjArray);
		
				todayDateObj = new Date();
				var day = todayDateObj.getDate();
				var month = todayDateObj.getMonth() + 1;
				var year = todayDateObj.getFullYear();
				todayDateString = month +'/'+day+'/'+year;
				log.debug('todayDateString is:', todayDateString);
				
				//load our PO
				var poRecObj = record.load({type: record.Type.PURCHASE_ORDER, id: poIdInput, isDynamic: false});
				log.debug('Loaded PO with ID:', poIdInput);
				
				var lineCount = poRecObj.getLineCount({sublistId: 'item'});
				
				//process our lineObjArray writing to the PO record
				for(var q = 0; q < lineObjArray.length; q++){
					
						var lineNumberFound = poRecObj.findSublistLineWithValue({sublistId: 'item', fieldId: 'line', value: lineObjArray[q].lineid});
						
						poRecObj.setSublistValue({sublistId: 'item', fieldId: 'rate', line: lineNumberFound, value: Number(lineObjArray[q].unitprice)});
						
						//if there is already a value in the field, let's append to it
						var existingAckNumberValue = poRecObj.getSublistValue({sublistId: 'item', fieldId: 'custcolacknowledgement_number', line: lineNumberFound});
						if(existingAckNumberValue && existingAckNumberValue !== null && existingAckNumberValue !== 'undefined'){
							valueSet = existingAckNumberValue + ', ' + ackNumberInput;
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcolacknowledgement_number', line: lineNumberFound, value: valueSet});
						}
						else{
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcolacknowledgement_number', line: lineNumberFound, value: ackNumberInput});
						}
						
						//set ackdates
						var existingAckDateValue = poRecObj.getSublistValue({sublistId: 'item', fieldId: 'custcol_ack_dates', line: lineNumberFound});
						if(existingAckDateValue && existingAckDateValue !== null && existingAckDateValue !== 'undefined'){
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcol_ack_dates', line: lineNumberFound, value: existingAckDateValue + ', ' + todayDateString});
						}
						else{
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcol_ack_dates', line: lineNumberFound, value: todayDateString});
						}
					/**	
						var existingAckTotal = poRecObj.getSublistValue({sublistId: 'item', fieldId: 'custcol_date_acknowledgement', line: lineNumberFound});
						if(existingAckTotal && existingAckTotal !== null && existingAckTotal !== 'undefined'){
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcol_ack_total', line: lineNumberFound, value: Number(existingAckTotal) + Number(ackTotalAllLines)});
							log.debug('Set custcol_ack_total of:', Number(existingAckTotal) + Number(ackTotalAllLines));
						}
						else{
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcol_ack_total', line: lineNumberFound, value: Number(ackTotalAllLines)});
							
						}
					**/	
						var existingQtyAckd = poRecObj.getSublistValue({sublistId: 'item', fieldId: 'custcol_ack_quantity', line: lineNumberFound});
						if(existingQtyAckd && existingQtyAckd !== null && existingQtyAckd !== 'undefined'){
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcol_ack_quantity', line: lineNumberFound, value: Number(existingQtyAckd) + Number(lineObjArray[q].quantitytoack)});
							log.debug('Set custcol_ack_quantity of:', Number(existingQtyAckd) + Number(lineObjArray[q].quantitytoack));
						}
						else{
							poRecObj.setSublistValue({sublistId: 'item', fieldId: 'custcol_ack_quantity', line: lineNumberFound, value: Number(lineObjArray[q].quantitytoack)});
							
						}
						
						
						
				
				}//end for loop q processing PO record's sublist
				
				//save PO
				var poRecIdSubmitted = poRecObj.save({enableSourcing: true, ignoreMandatoryFields: true});
				log.debug('Submitted PO with ID:', poRecIdSubmitted);
				
				
			//}//end for loop of all POs to act on
		
		
		//start displaying page
				
			//set PO NUMBER field with the previously inputted document number
			//poNumberField.defaultValue = poIdInput;
/**
		//find lines on that PO	
		var purchaseorderSearchObj = search.create({
		   type: "purchaseorder",
		   filters:
		   [
			  ["type","anyof","PurchOrd"], 
			  "AND", 
			  ["mainline","is","F"],
			  "AND", 
			  ["internalid","anyof", poIdInput]
		   ],
		   columns:
		   [
			  search.createColumn({name: "trandate", sort: search.Sort.ASC, label: "Date"}),
			  search.createColumn({name: "tranid", label: "Document Number"}),
			  search.createColumn({name: "item", label: "Item"}),
			  search.createColumn({name: "displayname", join: "item", label: "Display Name"}),
			  search.createColumn({name: "salesdescription", join: "item", label: "Description"}),
			  search.createColumn({name: "custcol_item_mpn_po", label: "MPN"}),
			  search.createColumn({name: "formulatext", formula: "{entity}", label: "Formula (Text)"}),
			  search.createColumn({name: "quantity", label: "Quantity"}),
			  search.createColumn({name: "rate", label: "Item Rate"}),
			  search.createColumn({name: "amount", label: "Amount"}),
			  search.createColumn({name: "altname", join: "vendor", label: "Name"}),
			  search.createColumn({name: "custcol_ack_quantity", label: "Acknowledged Quantity"}),
			  search.createColumn({name: "custcol_ack_total", label: "Ack. Total"}),
			  search.createColumn({name: "custcolacknowledgement_number", label: "Acknowledgement #"}),
			  search.createColumn({name: "custcol_ack_total", label: "Acknowledgement Total"}),
			  search.createColumn({name: "custcol1", label: "Acknowledgment Balances"}),
			  search.createColumn({name: "custcol_date_acknowledgement", label: "Date of Acknowledgement"}),
			  search.createColumn({name: "custcol_ack_dates", label: "Date of Acknowledgement"}),
			  search.createColumn({name: "line", label: "Line ID"})
		   ]
		});
		var searchResultCount = purchaseorderSearchObj.runPaged().count;
		log.debug("purchaseorderSearchObj result count",searchResultCount);
		var j = 0;

		purchaseorderSearchObj.run().each(function(result){
				
                sublist.setSublistValue({id: 'purchorder', line: j, value: result.getValue({name: 'tranid'})});
				
                sublist.setSublistValue({id: 'itemname', line: j, value: result.getText({name: 'item'})});
				
				if(result.getValue({name: 'custcol_item_mpn_po'})){
					sublist.setSublistValue({id: 'mpn', line: j, value: result.getValue({name: 'custcol_item_mpn_po'})});
				}
				
				if(result.getValue({name: 'displayname', join: 'item'})){
				sublist.setSublistValue({id: 'displayname', line: j, value: result.getValue({name: 'displayname', join: 'item'})});
				}
				
				if(result.getValue({name: 'salesdescription', join: 'item'})){
					sublist.setSublistValue({id: 'itemdescription', line: j, value: result.getValue({name: 'salesdescription', join: 'item'})});
				}
				
				if(result.getValue({name: 'altname', join: 'vendor'})){
					sublist.setSublistValue({id: 'vendor', line: j, value: result.getValue({name: 'altname', join: 'vendor'})});
				}
				
				if(result.getValue({name: 'custcol_ack_quantity'})){
					sublist.setSublistValue({id: 'quantityalreadyackd', line: j, value: result.getValue({name: 'custcol_ack_quantity'})});
				}
				else{
					sublist.setSublistValue({id: 'quantityalreadyackd', line: j, value: 0});
				}
				
				if(result.getValue({name: 'custcolacknowledgement_number'})){
					sublist.setSublistValue({id: 'acknmber', line: j, value: result.getValue({name: 'custcolacknowledgement_number'})});
				}
				
				
					sublist.setSublistValue({id: 'dollartotalackd', line: j, value: 0});
				
				
				if(result.getValue({name: 'custcol_ack_dates'})){
					sublist.setSublistValue({id: 'ackentrydate', line: j, value: result.getValue({name: 'custcol_ack_dates'})});
				}
				

				sublist.setSublistValue({id: 'unitprice', line: j, value: result.getValue({name: 'rate'})});
				sublist.setSublistValue({id: 'quantity', line: j, value: result.getValue({name: 'quantity'})});
				sublist.setSublistValue({id: 'lineid', line: j, value: result.getValue({name: 'line'})});

                j++;
				return true;
            });
**/		
			

		//disable fields
		var lineCountStart = context.request.getLineCount({sublistId: 'custpage_table'});
		for(var e = 0; e < lineCountStart; e++){
			
			//var poColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'purchorder', line: e});
			//poColumn.isDisabled = true;
			
			var itemColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'itemname', line: e});
			itemColumn.isDisabled = true;
			
			var mpnColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'mpn', line: e});
			mpnColumn.isDisabled = true;
			
			var displayNameColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'displayname', line: e});
			displayNameColumn.isDisabled = true;
			
			var itemDescColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'itemdescription', line: e});
			itemDescColumn.isDisabled = true;
			
			//var vendorColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'vendor', line: e});
			//vendorColumn.isDisabled = true;
			
			var unitPriceColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'unitprice', line: e});
			unitPriceColumn.isDisabled = true;
			
			var qtyColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'quantity', line: e});
			qtyColumn.isDisabled = true;
			
			var qtyAlreadyAckdColumn = sublist.getSublistField({sublistId: 'custpage_table', fieldId: 'quantityalreadyackd', line: e});
			qtyAlreadyAckdColumn.isDisabled = true;
			
		}//end lineCountStart for loop
	
			

	}//end if tableLineCount		
			//write form
			//context.response.writePage(form);
			log.debug("Remaining governance units in POST: ", scriptObj.getRemainingUsage());
			
			//redirect.open("/app.netsuite.com/app/common/search/searchresults.nl?searchid=1088&whence=");
			
			redirect.redirect({
				url: '/app/common/search/searchresults.nl?searchid=1088',
				parameters: {}
			});
			
			
	  }//end else
	
	}

    return {
        onRequest : onRequest
    };

});



