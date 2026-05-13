import { JSONFilePreset } from "lowdb/node";

const word_list = await JSONFilePreset("word_list.json", []);
await word_list.read();

const new_word = [];
for (let i = 0; i < new_word.length; i++) {
  word_list.data.push(new_word[i]);
}

word_list.data = [...new Set(word_list.data)];
await word_list.write();
