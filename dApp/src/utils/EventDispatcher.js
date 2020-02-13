class EventDispatcher{
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
		if(!this.eventExist(event)){
			this.events[event] = []
		}
        
        this.events[event].push({k : id, v : callback});
        return true;
    }
    
    //remove event subscriber
	removeEventSubscriber(event, id){
        if(!this.eventExist(event)){
            console.error("NO SUCH EVENT ", event, "TO UNSUBSCRIBE FROM");
            return false;
        }

        //filter out the subscriber corresponding to id
        this.events[event] = this.events[event].filter((subscriber) => {
            return subscriber.k !== id;
        });
    }
    
    //dispatch event by executing the callbacks
    dispatch(event, data){
        if(!this.eventExist(event)){
            //console.error("DISPATCHING INTERRUPTED: NO SUCH EVENT", event);
            return false;
        }
        
        //for each subscriber, execute its callback
        this.events[event].forEach((subscriber) => {
            subscriber.v(data);
        })
    }

    //check if the event exists
    eventExist(event){
        return this.events[event] !== undefined;
    }
}

export default EventDispatcher;