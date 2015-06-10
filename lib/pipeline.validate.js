'use strict';

/**
 * Pipeline Validate
 *
 */

module.exports = PipelineValidate;

/* ---------------------------------------------------
 * Constructor
 * --------------------------------------------------- */
function PipelineValidate() {
}

PipelineValidate.prototype.getName = function() {
    return 'validate';
};

PipelineValidate.prototype.getProps = function() {
    return ['validate'];
};

// DI
PipelineValidate.prototype.run = function($rawRequest, validate) {
    if (validate) {
        // bad inputs
        var validateErrors = this._validateInputs($rawRequest, validate);
        if (validateErrors) {
            error(validateErrors);
            return;
        }
    }
};

// TODO: replace with lib, move to http.framework
PipelineValidate.prototype._validateInputs = function(req, cInput) {
    var errors = [];

    for(var i in cInput) {
        //logger.log("_validateInputs:" , i);

        // check input type
        if(req.hasOwnProperty(i)) {

            for(var k in cInput[i]) {
                // check required
                if( !req[i].hasOwnProperty(k) &&
                    cInput[i][k].required){
                    // missing
                    errors.push({error: "Missing "+i+" "+k, type: "missing", id: k});
                }
                // check type
                else if( req[i].hasOwnProperty(k)  &&
                    cInput[i][k].type ) {

                    var tFuncName = "is"+util.String.capitalize( cInput[i][k].type );
                    // check if lodash has type function
                    if(_[tFuncName]) {
                        // check if input passes type function
                        if( !_[tFuncName]( req[i][k] ) ){
                            errors.push({error: "Invalid input "+k+" with value "+req[i][k]+", expecting type "+i, type:"invalid", id: k});
                        }
                    }
                }
            }

        }
    }

    if(errors.length == 0) {
        errors = undefined;
    }
    if(errors.length == 1) {
        errors = errors[0];
    }
    return errors;
};
