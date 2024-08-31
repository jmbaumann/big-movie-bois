import React from "react";
import { Button, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import { api } from "~/utils/api";
import type { RouterOutputs } from "~/utils/api";

const Index = () => {
  const utils = api.useContext();

  const { data } = api.example.hello.useQuery();

  return (
    <SafeAreaView className="bg-[#181c20]">
      {/* Changes page title visible on the header */}
      <Stack.Screen
        options={{
          title: "Letterboxd Fantasy",
          headerTitleStyle: { color: "#fff" },
        }}
      />
      <View className="mt-0 h-full w-full overflow-y-scroll p-4 pt-0">
        <Text className="font-sans uppercase text-[#9ac]">{data}</Text>
      </View>
    </SafeAreaView>
  );
};

export default Index;
