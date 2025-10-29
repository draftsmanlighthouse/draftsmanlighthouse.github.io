document.addEventListener("alpine:init", () => {
  Alpine.data("taskBoard", function () {
    return {
      statuses: {
        DD: {
            todo: "init",
            inprogress: "draft",
            waiting: "review",
            done: "decided",
            rejected: "rejected"
        },
        ADR: {
            todo: "init",
            inprogress: "draft",
            waiting: "review",
            done: "decided",
            rejected: "rejected"
        },
        principle: {
            todo: "init",
            inprogress: "draft",
            waiting: "review",
            done: "published",
            rejected: "deleted"
        },
        persona: {
            todo: "init",
            inprogress: "draft",
            waiting: "review",
            done: "published",
            rejected: "deleted"
        }
      },
      columns: {
        todo: { title: "To Do", statuses: ["init"] },
        inprogress: { title: "In Progress", statuses: ["draft"] },
        waiting: { title: "Waiting On…", statuses: ["waiting", "blocked", "review"] },
        done: { title: "Done", statuses: ["done", "completed", "published", "decided"] },
      },

      tasks: [],
      show_done: this.$persist(true),
      show_board: this.$persist(true),
      show_list: this.$persist(false),
      search: this.$persist(""),
      selected: this.$persist(""),
      newTaskTitle: "",
      ids: this.$persist([]),
      text_filter(search){
        this.ids = this.miniSearch.search(search).map(x => x.id);
      },
      // ✅ Kolom toont ALLE taken met status in column.statuses
      filteredTasks(columnKey) {
        if (columnKey == "rejected"){
            return this.tasks.filter((t) => ["rejected","deleted"].includes(t.status));
        }
        const col = this.columns[columnKey];
        return this.tasks.filter((t) => col.statuses.includes(t.status));
      },

      // ✅ Drag & drop
      initSortable(el, columnKey) {
        const col = this.columns[columnKey];
        new Sortable(el, {
          group: "tasks",
          animation: 150,
          handle: ".handle",
          onAdd: (evt) => {
            const id = evt.item.dataset.id;
            const task = this.tasks.find((t) => t.id === id);
            console.log(columnKey);
            if (task) {
              // stel de status in op de "eerste" status van deze kolom
              console.log(this.statuses[task.type][columnKey])
              task.status = this.statuses[task.type][columnKey];
              this.tasks = [...this.tasks];
            }
          },
        });
      }

    };
  });
});