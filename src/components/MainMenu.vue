<template>
  <div class="menu">
    <button class="menu-button" @click="handleButtonClick" value="input">
      <label for="fileInput" class="button-label">
        <img class="button-image" src="../assets/file.png" alt="Select Image" />
      </label>
      <input
        id="fileInput"
        class="button-input"
        type="file"
        @change="handleImageSelection"
      />
    </button>
    <button class="menu-button" @click="handleButtonClick" value="pipette">
      <label
        class="button-label"
        :class="{ 'button-label-tapped': state === 'pipette' }"
      >
        <img class="button-image" src="../assets/pipette.png" alt="Pipette" />
      </label>
    </button>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "MainMenu",
  props: {
    state: String,
  },
  data() {
    return {
      selectedImage: "",
    };
  },
  methods: {
    handleImageSelection(event) {
      const target = event.target;
      const selectedFile = target.files?.[0];

      if (selectedFile) {
        const imageUrl = URL.createObjectURL(selectedFile);
        this.selectedImage = imageUrl;
        this.$emit("onImageSelected", imageUrl);

        target.value = "";
      }
    },
    handleButtonClick(event) {
      const target = event.target;
      const value = target.parentElement?.value
        ? target.parentElement.value
        : target.parentElement?.parentElement.value;
      this.$emit("changeState", value);
    },
  },
  beforeUnmount() {
    if (this.selectedImage) {
      URL.revokeObjectURL(this.selectedImage);
    }
  },
  watch: {
    state(newValue) {
      if (newValue === "pipette") {
        this.stateCursor = "pipette";
      } else this.stateCursor = null;
    },
  },
});
</script>

<style scoped lang="scss">
.menu {
  width: 50px;
  height: calc(100% - 10px);
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  background: #ececec;
}

.button {
  &-input {
    width: 100%;
    display: none;
  }

  &-label {
    cursor: pointer;
    background: #d6d6d6;
    border-radius: 10px;
    border: 10px solid #d6d6d6;
    display: block;
    transition: 0.3s;
    &:hover {
      background: #a0a0a0;
      border-color: #a0a0a0;
    }
    &-tapped {
      background: #a0a0a0;
      border-color: #a0a0a0;
    }
  }

  &-image {
    height: 25px;
  }
}
</style>
