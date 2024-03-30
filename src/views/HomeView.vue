<template>
  <div class="container">
    <MainMenu
      @onImageSelected="handleImageSelected"
      :state="state"
      @changeState="changeState"
    />
    <MainEditor :img="img" @changeState="changeState" :state="state" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import MainMenu from "../components/MainMenu.vue";
import MainEditor from "../components/MainEditor.vue";

export default defineComponent({
  name: "HomeView",
  components: { MainMenu, MainEditor },
  data() {
    return {
      img: "",
      state: "",
    };
  },
  methods: {
    handleImageSelected(imageUrl: string) {
      this.img = imageUrl;
    },
    changeState(state: string) {
      this.state = state;
    },
    handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        this.state = "";
      }
    },
  },
  mounted() {
    window.addEventListener("keydown", this.handleEscapeKey);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleEscapeKey);
  },
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  width: 100%;
  height: 100%;
}
</style>
