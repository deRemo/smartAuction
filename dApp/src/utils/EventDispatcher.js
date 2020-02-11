export class EventDispatcher{
    constructor(){
        this.events = {};
    }

    //add event subscriber
	addEventSubscriber(event, id, callback){
		if(typeof callback !== 'function'){
            console.error("EVENT DISPATCHER ERROR: THE CALLBACK MUST BE A FUNCTION")
            return false;
		}

		if(typeof event !== 'string'){
            console.error("EVENT DISPATCHER ERROR: THE EVENT NAME MUST BE A STRING")
            return false;
		}

		//create event if it doesn't exist
		if(this.events[event] === undefined){
			this.events[event] = []
		}
        
        this.events[event].push({k : id, v : callback});
        return true;
    }
    
    //remove event subscriber
	removeEventSubscriber(event, id){
        if(this.events[event] === undefined){
            console.error("EVENT DISPATCHER ERROR: NO SUCH EVENT");
            return false;
        }

        //filter out the subscriber corresponding to id
        this.events[event] = this.events[event].filter((subscriber) => {
            return subscriber.k !== id;
        });
    }
    
    //dispatch event by executing the callbacks
    dispatch(event, data){
        if(this.events[event] === undefined){
            console.error("EVENT DISPATCHER ERROR: NO SUCH EVENT");
            return false;
        }

        //for each subscriber, execute its callback
        this.events[event].forEach((subscriber) => {
            subscriber.v(data);
        })
    }
}