import React, { useEffect, useState } from 'react';
import { useChatContext } from '../context/chatContext';
import { IoArrowBackOutline } from 'react-icons/io5';
import { getSender, getSendersFullDetails } from '../utils/helpers';
import { useUserContext } from '../context/userContext';
import bcg2 from '../assets/bcg-2.png';
import bcg from '../assets/bcg.png';
import axios from 'axios';
import io from 'socket.io-client';
import {
  ProfileModal,
  SpinnerLoader,
  UpdateGroupChatModal,
  ScrollableChat,
} from '.';
import {
  Box,
  Image,
  IconButton,
  Flex,
  Text,
  FormControl,
  useToast,
  VStack,
  Avatar,
  HStack,
  Input,
} from '@chakra-ui/react';

let socket;
let selectedChatBackup;
let timeout;

function SingleChat() {
  const { currentUser } = useUserContext();
  const { selectedChat, setSelectedChat } = useChatContext();
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchMessages = async () => {
    if (!selectedChat) {
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`/api/message/${selectedChat._id}`);
      const { data } = response.data;
      setMessages(data);
      setLoading(false);
      socket.emit('join_room', selectedChat._id);
    } catch (error) {
      const { message } = error.response.data;
      setLoading(false);
      return toast({
        position: 'top',
        title: 'Error occured',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const sendMessage = async (e) => {
    if (e.key === 'Enter' && newMessage) {
      try {
        const body = {
          chatId: selectedChat._id,
          content: newMessage,
        };
        setNewMessage('');
        const response = await axios.post('/api/message', body);
        const { data } = response.data;
        socket.emit('new_message', data);
        socket.emit('stop_typing', selectedChat._id);
        setMessages((prev) => {
          return [...prev, data];
        });
      } catch (error) {
        const { message } = error.response.data;
        return toast({
          position: 'top',
          title: 'Error occured',
          description: message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socketConnected) {
      return;
    }
    if (!typing) {
      setTyping(true);
      socket.emit('typing', selectedChat._id);
    }
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      setTyping(false);
      socket.emit('stop_typing', selectedChat._id);
    }, 3000);
  };

  useEffect(() => {
    socket = io(process.env.REACT_APP_BACKEND_URL);
    socket.emit('setup', currentUser);
    socket.on('connected', () => setSocketConnected(true));
    socket.on('typing', () => setIsTyping(true));
    socket.on('stop_typing', () => setIsTyping(false));
    socket.on('new_message_recieved', (message) => {
      if (!selectedChatBackup || selectedChatBackup._id !== message.chat._id) {
        return;
      } else {
        setMessages((prev) => {
          return [...prev, message];
        });
      }
    });
  }, []);

  useEffect(() => {
    fetchMessages();
    selectedChatBackup = selectedChat;
  }, [selectedChat]);

  return (
    <Flex flexDirection='column' w='100%'>
      {selectedChat ? (
        <>
          <Flex
            p='4'
            bg='gray.100'
            justifyContent='space-between'
            alignItems='center'
            shadow='sm'
          >
            <IconButton
              icon={<IoArrowBackOutline />}
              d={{ base: 'flex', md: 'none' }}
              onClick={() => setSelectedChat(null)}
            />
            {!selectedChat.isGroupChat ? (
              <>
                <HStack spacing='4'>
                  <Avatar
                    size='md'
                    name={getSender(currentUser, selectedChat.users)}
                    src={
                      getSendersFullDetails(currentUser, selectedChat.users)
                        .avatar.url
                    }
                  />
                  <VStack spacing='0' alignItems='flex-start'>
                    <Text>{getSender(currentUser, selectedChat.users)}</Text>
                    {isTyping && (
                      <Text fontSize='sm' fontWeight='600' color='whatsapp.500'>
                        typing...
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <ProfileModal
                  user={getSendersFullDetails(currentUser, selectedChat.users)}
                />
              </>
            ) : (
              <>
                <HStack spacing='4'>
                  <Avatar size='md' name={selectedChat.chatName} />
                  <VStack spacing='0' alignItems='flex-start'>
                    <Text>{selectedChat.chatName.toUpperCase()}</Text>
                    {isTyping && (
                      <Text fontSize='sm' fontWeight='600' color='whatsapp.500'>
                        typing...
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <UpdateGroupChatModal fetchMessages={fetchMessages} />
              </>
            )}
          </Flex>
          <Flex
            w='100%'
            h='100%'
            flexDirection='column'
            justifyContent='flex-end'
            backgroundImage={bcg}
            overflowY='hidden'
          >
            {loading ? (
              <SpinnerLoader size='xl' margin='auto' alignSelf='center' />
            ) : (
              <Flex flexDirection='column' overflowY='auto'>
                <ScrollableChat messages={messages} />
              </Flex>
            )}
            <Box py='2' px='4' bg='gray.100'>
              <FormControl onKeyDown={sendMessage} isRequired>
                <Input
                  bg='white'
                  focusBorderColor='none'
                  borderRadius='full'
                  placeholder='Write your message'
                  value={newMessage}
                  onChange={handleTyping}
                />
              </FormControl>
            </Box>
          </Flex>
        </>
      ) : (
        <Flex
          w='100%'
          h='100%'
          bg='gray.50'
          flexDirection='column'
          justifyContent='space-between'
          alignItems='center'
          overflowY='hidden'
        >
          <VStack
            w='50%'
            m='auto'
            spacing='4'
            justifyContent='center'
            alignItems='center'
          >
            <Image src={bcg2} width='300px' />
            <Text textAlign='center' fontSize='3xl' fontWeight='300'>
              No need to keep phone connected
            </Text>
            <Text textAlign='center' fontWeight='300' color='gray.400'>
              TomperChat is centralized and doesn't need phone to be connected.
              Also its not End-To-End Encrypted, so chat wisely.
            </Text>
          </VStack>
          <Box w='100%' h='10px' alignSelf='flex-end' bg='whatsapp.400'></Box>
        </Flex>
      )}
    </Flex>
  );
}

export default SingleChat;
