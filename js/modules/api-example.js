document.addEventListener('alpine:init', () => {
    Alpine.data('apiModule', function(){
        return {
            feedbackItems: [],
            feedBackCommand: this.$persist({}),
            _prepare_data(data){
                this.feedbackItems = data["data"]["Feedback"]["filter"]["resultset"];
            },
            _track(data){
                alert(JSON.stringify(data));
            },
            async init(){
                let api = await API.initialize();
                let data = await api.query("/prepared-statements/fetch-feedback.txt");
                this._prepare_data(data);
            },
            async save_item(){
                let api = await API.initialize();
                let correlationId = await api.mutation("/prepared-statements/insert-feedback.txt",this.feedBackCommand);
                console.log(correlationId);
                await api.subscription("/prepared-statements/subscribe-track-and-trace.txt",{correlationId},this._track.bind(this));
            }
        }
    });
});