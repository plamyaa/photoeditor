<template>
  <div class="color-info-panel">
    <div class="panel-header">
      <button class="close-button" @click="close">X</button>
    </div>
    <div class="color-info">
      <div class="color-sample"></div>
    </div>
    <div class="color-info">
      <div class="color-sample"></div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "SideBar",
  props: {},
  methods: {
    close() {
      this.$emit("close");
    },
  },
});
</script>

<style scoped lang="scss">
.color-info-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 200px;
  height: 500px;
  background: #ececec;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;

  .panel-header {
    display: flex;
    justify-content: end;

    .close-button {
      font-size: 20px;
      cursor: pointer;
      font-weight: bold;
      color: #4f4f4f;
      background: transparent;
    }
  }
}
</style>
