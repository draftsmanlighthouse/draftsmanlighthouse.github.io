document.addEventListener('alpine:init', () => {
    Alpine.data('navigation', function(){
        return {
            navigation: this.$persist("my-first-page"),
            navigationElementActive: function(){
                let navigation = this.$el.getAttribute("navigation");
                return navigation == this.navigation ? 'active' : ''
            },
            navigate: function(){
                this.navigation = this.$el.getAttribute("navigation");
            }
        }
    });
})